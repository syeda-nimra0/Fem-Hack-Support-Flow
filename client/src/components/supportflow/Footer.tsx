

import { Github, Twitter, Linkedin } from "lucide-react";
import Logo from "./Logo";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:flex-row lg:justify-between">
        <div className="max-w-sm">
          <Logo className="h-11" />
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            An AI-assisted customer support desk. Customers submit tickets, AI triages category,
            priority and summary, agents review and resolve — in real time.
          </p>
          <div className="mt-5 flex gap-2">
            {[
              { icon: <Github size={16} />, label: "GitHub" },
              { icon: <Twitter size={16} />, label: "Twitter" },
              { icon: <Linkedin size={16} />, label: "LinkedIn" },
            ].map((social) => (
              <span
                key={social.label}
                aria-label={social.label}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                {social.icon}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          <div>
            <h4 className="text-sm font-semibold">Product</h4>
            <ul className="mt-4 flex flex-col gap-2.5 text-sm text-muted-foreground">
              <li className="cursor-pointer hover:text-primary">Features</li>
              <li className="cursor-pointer hover:text-primary">AI Triage</li>
              <li className="cursor-pointer hover:text-primary">Live demo</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Resources</h4>
            <ul className="mt-4 flex flex-col gap-2.5 text-sm text-muted-foreground">
              <li className="cursor-pointer hover:text-primary">API documentation</li>
              <li className="cursor-pointer hover:text-primary">Demo credentials</li>
              <li className="cursor-pointer hover:text-primary">Data model</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Stack</h4>
            <ul className="mt-4 flex flex-col gap-2.5 text-sm text-muted-foreground">
              <li>React · Node.js · Express</li>
              <li>MongoDB Atlas · Socket.IO</li>
              <li>Google Gemini · Vite</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} SupportFlow — SMIT Hackathon · AI Factory 2.0</p>
          <p>Built with the MERN stack &amp; Google Gemini</p>
        </div>
      </div>
    </footer>
  );
}
