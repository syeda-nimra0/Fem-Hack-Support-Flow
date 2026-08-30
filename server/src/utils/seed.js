import { User } from '../models/User.js';
import { Ticket } from '../models/Ticket.js';
import { triageTicket } from '../services/triageService.js';
import { createDemoUser } from '../controllers/authController.js';
import bcrypt from 'bcryptjs';

const DEMO_AGENTS = [
  { name: 'Sarah Johnson', email: 'agent@supportflow.demo', password: 'password123', role: 'agent', specialties: ['billing', 'account'] },
  { name: 'Mike Chen', email: 'mike@supportflow.demo', password: 'password123', role: 'agent', specialties: ['technical', 'product'] },
  { name: 'Admin User', email: 'admin@supportflow.demo', password: 'password123', role: 'admin' },
];

const DEMO_CUSTOMERS = [
  { name: 'Alex Customer', email: 'customer@supportflow.demo', password: 'password123', role: 'customer' },
  { name: 'Priya Sharma', email: 'priya@supportflow.demo', password: 'password123', role: 'customer' },
];

const DEMO_TICKETS = [
  {
    subject: 'Charged twice for the same order',
    description: 'I was charged twice for the same order yesterday and need one payment refunded. The order number is #4821 and I see two $129 charges on my card.',
    customerEmail: 'customer@supportflow.demo',
  },
  {
    subject: 'Cannot log in after password reset',
    description: 'I reset my password but now I cannot log in. It keeps saying invalid credentials. I have tried multiple times.',
    customerEmail: 'priya@supportflow.demo',
  },
  {
    subject: 'How do I export my data to CSV?',
    description: 'I want to download all my project data as a CSV file. Is there an export feature? I could not find it in the settings.',
    customerEmail: 'customer@supportflow.demo',
  },
  {
    subject: 'App keeps crashing on dashboard page',
    description: 'Every time I navigate to the dashboard, the app crashes with a white screen. This is urgent - I cannot do my work. Started after the last update.',
    customerEmail: 'priya@supportflow.demo',
  },
  {
    subject: 'Package delivered to wrong address',
    description: 'My order shows as delivered but I never received it. The tracking says it was left at a different address. I need this resolved ASAP.',
    customerEmail: 'customer@supportflow.demo',
  },
];

export async function seedDemoData() {
  const userCount = await User.countDocuments();
  if (userCount > 0) {
    console.log('[seed] Users already exist, skipping seed.');
    return;
  }

  console.log('[seed] Creating demo users...');

  for (const u of DEMO_AGENTS) {
    await createDemoUser(u);
    console.log(`  - ${u.role}: ${u.email} / ${u.password}`);
  }
  for (const u of DEMO_CUSTOMERS) {
    await createDemoUser(u);
    console.log(`  - ${u.role}: ${u.email} / ${u.password}`);
  }

  console.log('[seed] Creating demo tickets...');
  for (const t of DEMO_TICKETS) {
    const customer = await User.findOne({ email: t.customerEmail });
    if (!customer) continue;

    let aiSuggestion = null;
    try {
      aiSuggestion = await triageTicket(t.subject, t.description);
    } catch (err) {
      console.warn('  - triage failed for', t.subject);
    }

    const ticketNumber = `SF-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    const ticket = await Ticket.create({
      ticketNumber,
      subject: t.subject,
      description: t.description,
      customer: customer._id,
      customerName: customer.name,
      category: aiSuggestion?.category || 'general',
      priority: aiSuggestion?.priority || 'medium',
      aiSuggestion,
      aiReviewed: false,
      messages: [{
        sender: customer._id,
        senderRole: 'customer',
        senderName: customer.name,
        content: t.description,
        isInternal: false,
      }],
    });
    console.log(`  - ${ticket.ticketNumber}: ${t.subject}`);
  }

  console.log('[seed] Demo data created successfully.');
  console.log('\n  Demo credentials:');
  console.log('    Customer:  customer@supportflow.demo / password123');
  console.log('    Agent:     agent@supportflow.demo / password123');
  console.log('    Admin:     admin@supportflow.demo / password123\n');
}
