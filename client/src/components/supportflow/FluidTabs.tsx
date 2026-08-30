

/**
 * FluidTabs — pill-style tabs with a spring-animated indicator.
 * Adapted from upload/Code 2.md (animata FluidTabs), fully keyboard accessible.
 */
import {
  Children,
  type ComponentProps,
  createContext,
  type FocusEvent,
  isValidElement,
  type KeyboardEvent,
  type ReactNode,
  use,
  useEffect,
  useId,
  useState,
} from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const INDICATOR_SPRING = {
  type: "spring" as const,
  stiffness: 380,
  damping: 34,
  mass: 0.75,
};

const LABEL_TRANSITION = {
  duration: 0.28,
  ease: [0.32, 0.72, 0, 1] as const,
};

type FluidTabsContextValue = {
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  focusedIndex: number;
  setFocusedIndex: (index: number) => void;
  indicatorLayoutId: string;
};

const FluidTabsContext = createContext<FluidTabsContextValue | null>(null);
const FluidTabSlotContext = createContext<{ index: number } | null>(null);

function useFluidTabs() {
  const context = use(FluidTabsContext);
  if (!context) throw new Error("FluidTabs primitives must be used within <FluidTabs>.");
  return context;
}

function tabFocusClass(radiusClass: string) {
  return cn(radiusClass, "outline-none focus-visible:z-10", "focus-visible:ring-2 focus-visible:ring-ring");
}

function focusTabInList(tablist: HTMLElement, index: number) {
  queueMicrotask(() => {
    tablist.querySelectorAll<HTMLElement>('[role="tab"]')[index]?.focus();
  });
}

function handleTabListKeyDown(
  event: KeyboardEvent<HTMLElement>,
  count: number,
  setActiveIndex: (index: number) => void,
  setFocusedIndex: (index: number) => void
) {
  if (count < 1) return;
  const tablist = event.currentTarget;
  const tabs = tablist.querySelectorAll<HTMLElement>('[role="tab"]');
  const target = event.target as HTMLElement;
  const currentTab = target.closest<HTMLElement>('[role="tab"]');
  if (!currentTab || !tablist.contains(currentTab)) return;
  const currentIndex = Array.from(tabs).indexOf(currentTab);
  if (currentIndex === -1) return;

  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    setActiveIndex(currentIndex);
    setFocusedIndex(currentIndex);
    return;
  }
  if (count < 2) return;

  let next: number | null = null;
  switch (event.key) {
    case "ArrowRight":
    case "ArrowDown":
      next = (currentIndex + 1) % count;
      break;
    case "ArrowLeft":
    case "ArrowUp":
      next = (currentIndex - 1 + count) % count;
      break;
    case "Home":
      next = 0;
      break;
    case "End":
      next = count - 1;
      break;
    default:
      return;
  }
  event.preventDefault();
  setFocusedIndex(next);
  focusTabInList(tablist, next);
}

type FluidTabsRootProps = {
  children: ReactNode;
  defaultActiveIndex?: number;
  activeIndex?: number;
  onActiveIndexChange?: (index: number) => void;
  className?: string;
};

function FluidTabsRoot({
  children,
  defaultActiveIndex = 0,
  activeIndex: activeIndexProp,
  onActiveIndexChange,
  className,
}: FluidTabsRootProps) {
  const [uncontrolledIndex, setUncontrolledIndex] = useState(defaultActiveIndex);
  const activeIndex = activeIndexProp ?? uncontrolledIndex;

  const setActiveIndex = (index: number) => {
    onActiveIndexChange?.(index);
    if (activeIndexProp === undefined) setUncontrolledIndex(index);
  };

  const indicatorLayoutId = `fluid-tab-indicator-${useId().replace(/:/g, "")}`;

  return (
    <FluidTabsContext.Provider
      value={{
        activeIndex,
        setActiveIndex,
        focusedIndex: activeIndex,
        setFocusedIndex: () => {},
        indicatorLayoutId,
      }}
    >
      <div className={cn("flex w-full items-center justify-center", className)}>{children}</div>
    </FluidTabsContext.Provider>
  );
}

function FluidTabsList({
  className,
  children,
  "aria-label": ariaLabel = "Tabs",
  ...props
}: ComponentProps<"nav"> & { "aria-label"?: string }) {
  const { setActiveIndex } = useFluidTabs();
  const tabs = Children.toArray(children).filter(isValidElement);
  const count = tabs.length;

  return (
    <nav
      aria-label={ariaLabel}
      className={cn(
        "no-scrollbar relative w-full max-w-full overflow-x-auto rounded-full bg-muted p-1",
        className
      )}
      {...props}
    >
      <div
        role="tablist"
        onKeyDown={(event: KeyboardEvent<HTMLElement>) => {
          handleTabListKeyDown(event, count, setActiveIndex, () => {});
        }}
        className="flex w-full min-w-max gap-1"
      >
        {tabs.map((tab, index) => (
          <FluidTabSlotContext.Provider key={tab.key ?? index} value={{ index }}>
            {tab}
          </FluidTabSlotContext.Provider>
        ))}
      </div>
    </nav>
  );
}

function FluidTabsIcon({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 empty:hidden [&_svg]:size-[16px]", className)}
      {...props}
    />
  );
}

function FluidTabsLabel({ className, ...props }: ComponentProps<"span">) {
  return <span className={cn("whitespace-nowrap", className)} {...props} />;
}

function FluidTabsTab({
  className,
  children,
  label,
  onClick,
  ...props
}: ComponentProps<"button"> & { label?: string }) {
  const { activeIndex, setActiveIndex, indicatorLayoutId } = useFluidTabs();
  const slot = use(FluidTabSlotContext);
  const index = slot?.index ?? 0;
  const isSelected = activeIndex === index;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isSelected}
      {...(label ? { "aria-label": label } : {})}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) setActiveIndex(index);
      }}
      className={cn(
        tabFocusClass("rounded-full"),
        "relative z-10 flex flex-1 items-center justify-center px-4 py-2 text-sm font-medium",
        "transition-colors",
        className
      )}
      {...props}
    >
      {isSelected ? (
        <motion.span
          layoutId={indicatorLayoutId}
          className="absolute inset-0 block rounded-full bg-card shadow-sm"
          transition={INDICATOR_SPRING}
          aria-hidden
        />
      ) : null}
      <motion.span
        className={cn(
          "relative z-10 inline-flex items-center justify-center gap-2",
          isSelected ? "text-foreground" : "text-muted-foreground"
        )}
        animate={{ scale: isSelected ? 1 : 0.98 }}
        transition={LABEL_TRANSITION}
      >
        {children}
      </motion.span>
    </button>
  );
}

const FluidTabs = Object.assign(FluidTabsRoot, {
  List: FluidTabsList,
  Tab: FluidTabsTab,
  Icon: FluidTabsIcon,
  Label: FluidTabsLabel,
});

export default FluidTabs;
export { FluidTabsIcon, FluidTabsLabel, FluidTabsList, FluidTabsRoot, FluidTabsTab };
