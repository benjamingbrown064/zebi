const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const taskDescriptions = {
  // Legal Setup project
  "Form Delaware LLC (Love Warranty Inc)": {
    why: "Legal entity required for L1A visa application and US business operations",
    how: "Use Stripe Atlas or similar service to file Delaware LLC with IRS EIN",
    outcome: "Delaware LLC formed with EIN, ready for visa and banking"
  },
  "California foreign qualification filing": {
    why: "Delaware entity must register to do business in California",
    how: "File Form S&DC-FR with California Secretary of State + registered agent",
    outcome: "Legal authorization to operate Love Warranty business in California"
  },
  "Research insurance/bonding requirements (California)": {
    why: "California may require specific insurance/bonds for warranty providers",
    how: "Consult California DMV + attorney to identify: surety bonds, liability insurance, regulatory requirements",
    outcome: "Clear list of required insurance/bonds with coverage amounts and costs"
  },
  "Obtain required business insurance": {
    why: "Protect company from claims liability and meet regulatory requirements",
    how: "Purchase: general liability ($2M), E&O insurance, surety bond (if required)",
    outcome: "All required insurance in place before accepting first California warranty"
  },
  "Federal EIN registration": {
    why: "Required for US tax compliance, banking, and payroll",
    how: "Apply via IRS Form SS-4 online (included in LLC formation)",
    outcome: "EIN issued and ready for bank account opening"
  },
  "California tax registration (sales tax, payroll)": {
    why: "Comply with California tax law for business operations",
    how: "Register with California CDTFA for sales tax permit + EDD for payroll taxes",
    outcome: "Tax accounts active, ready to collect/remit taxes correctly"
  },
  "Open US business bank account": {
    why: "Required for receiving payments and paying US expenses",
    how: "Apply at Mercury or Brex with Delaware entity docs + EIN",
    outcome: "US bank account with debit card and wire transfer capability"
  },
  
  // Dealer Partnership project
  "Identify 10-15 target dealers in California (specialist/performance)": {
    why: "Need qualified dealer pipeline to validate US platform model",
    how: "Research exotic/classic/luxury dealers in CA doing >100 cars/year - focus on John Graeme connections",
    outcome: "List of 10-15 qualified dealer prospects with contact info and warm intro paths"
  },
  "Create US dealer pitch deck": {
    why: "Need compelling presentation tailored to US dealer concerns",
    how: "Adapt UK deck: emphasize platform benefits, US compliance, local support, Redline case study",
    outcome: "Professional deck that converts dealer meetings to pilot agreements"
  },
  "Draft US partnership agreement template": {
    why: "Standard contract needed for dealer partnerships compliant with US law",
    how: "Work with US attorney: terms covering platform access, fees, data ownership, SLAs, termination",
    outcome: "Reusable partnership agreement protecting both parties under US law"
  },
  "Create dealer onboarding materials": {
    why: "Smooth onboarding = happy dealers = better retention and referrals",
    how: "Document: platform walkthrough, staff training guide, integration checklist, support contacts",
    outcome: "Self-service onboarding package that gets dealers operational in 2 weeks"
  },
  "Initial outreach to top 5 target dealers": {
    why: "Test messaging and gauge interest before scaling outreach",
    how: "Warm intros via John Graeme + personalized emails highlighting platform benefits",
    outcome: "3-5 interested dealers agreeing to discovery calls"
  },
  "Close first pilot dealer partnership": {
    why: "Secure anchor US customer to validate platform model",
    how: "Negotiate terms, sign agreement, begin onboarding - prioritize quick win over revenue",
    outcome: "First US dealer live on platform as reference customer"
  },
  "Close 2nd and 3rd pilot partnerships": {
    why: "Validate platform scales beyond one dealer and refine processes",
    how: "Apply learnings from first pilot, faster onboarding, address early feedback",
    outcome: "3 dealers live proving platform model works in US market"
  },
  
  // Platform Productization project
  "Design multi-tenant architecture (database schema)": {
    why: "One platform must serve multiple dealers with isolated data",
    how: "Schema: tenant_id on all tables, RLS policies, subdomain routing - document data flow",
    outcome: "Architecture doc showing how data isolation and scaling works"
  },
  "Build white-label configuration system": {
    why: "Each dealer needs their own branding on customer-facing pages",
    how: "Config per tenant: logo, colors, domain, email templates, T&Cs",
    outcome: "Dealers can customize branding without code changes"
  },
  "Create admin dashboard for platform clients": {
    why: "Dealers need self-service to manage their warranty operations",
    how: "Build UI for: view claims, manage policies, run reports, configure settings, track revenue",
    outcome: "Dealers operate independently without constant support tickets"
  },
  "Build configurable warranty rules engine": {
    why: "Different dealers have different coverage rules and pricing",
    how: "Rules builder: define coverage by vehicle type, age, mileage + configurable exclusions",
    outcome: "Dealers customize warranty terms without code changes"
  },
  "Build per-client reporting + analytics": {
    why: "Dealers need insights to optimize warranty offerings and pricing",
    how: "Dashboards: claim rates by vehicle type, profitability, customer satisfaction, trends",
    outcome: "Data-driven decisions about coverage and pricing for each dealer"
  },
  "Platform demo environment setup": {
    why: "Need safe place to show prospects platform without affecting production",
    how: "Clone production to demo subdomain with sample data + reset script",
    outcome: "Demo environment for sales that looks real but doesn't touch production"
  },
  "QA + security review": {
    why: "Platform handles sensitive dealer and customer data - must be secure",
    how: "Penetration testing, code review for SQL injection/XSS, audit RLS policies, test data isolation",
    outcome: "Security issues identified and fixed before go-live"
  },
  
  // B2B Sales project
  "Define target customer profiles (automotive + non-auto sectors)": {
    why: "Focus sales effort on highest-value segments with best product fit",
    how: "Profile: company size, revenue, warranty volume, pain points, buying process",
    outcome: "Clear ICP document that sales and marketing can execute against"
  },
  "Create platform licensing model + pricing tiers": {
    why: "Need structured pricing that scales from small dealers to large providers",
    how: "Model tiers: Starter (1-3 locations), Professional (4-10), Enterprise (10+) - % revenue vs flat fee",
    outcome: "Pricing model that's simple to explain and profitable at all tiers"
  },
  "Build sales deck + demo script": {
    why: "Sales team needs consistent messaging to convert prospects",
    how: "Deck: problem (warranty ops are manual/costly), solution (our platform), proof (metrics), pricing",
    outcome: "Professional deck + script that converts 30% of demos to proposals"
  },
  "Create case study materials (UK operations)": {
    why: "Social proof accelerates sales with skeptical prospects",
    how: "Write story: before (manual chaos) → implementation → after (time saved, revenue up, testimonial)",
    outcome: "Professional case study for sales deck and website"
  },
  "Write platform onboarding documentation": {
    why: "Customers need clear guide from contract signing to go-live",
    how: "Document: kickoff call, data migration, staff training, integration testing, launch checklist",
    outcome: "Repeatable onboarding process that takes 30-45 days"
  },
  "Identify 20 target platform prospects": {
    why: "Build sales pipeline beyond initial dealer partners",
    how: "Research: warranty providers (automotive, appliances, electronics) doing $5M+ annual revenue",
    outcome: "List of 20 qualified prospects with contact info and research notes"
  },
  "Initial outreach to first 10 prospects": {
    why: "Start filling sales pipeline with qualified opportunities",
    how: "Personalized emails highlighting industry-specific pain points + case studies",
    outcome: "3-5 prospects agreeing to discovery calls"
  },
  
  // Operations Infrastructure project
  "Research California warranty regulations": {
    why: "Must comply with California warranty law to operate legally",
    how: "Review California Civil Code 1790-1795.8 + consult attorney on service contract requirements",
    outcome: "Clear understanding of legal requirements: registration, disclosures, claim timeframes"
  },
  "Design US claims handling process": {
    why: "Claims process must meet California legal requirements and customer expectations",
    how: "Document workflow: claim submission → verification → garage assignment → approval → payment",
    outcome: "Compliant claims process that resolves 80% of claims in <7 days"
  },
  "Identify 10-15 California garage/service partners": {
    why: "Need trusted network to handle warranty repairs across California",
    how: "Research: establish criteria (ASE certified, good reviews, fair pricing), negotiate terms",
    outcome: "Network of vetted garages ready to handle warranty repairs"
  },
  "Set up US payment processing (Stripe)": {
    why: "Accept customer payments and pay dealers/garages via US banking system",
    how: "Configure Stripe Connect for platform: onboard dealers, handle splits, compliance",
    outcome: "Automated payment processing with proper fee splits and tax reporting"
  },
  "Configure Zendesk for US support (timezone coverage)": {
    why: "US customers expect support during US business hours",
    how: "Set up Zendesk instance: US phone number, PST business hours, SLA targets (respond <2hr)",
    outcome: "Professional support system covering US timezones"
  },
  "Build US warranty registration flow": {
    why: "Compliant with California regulations requiring clear terms and disclosures",
    how: "Registration form capturing required fields + California-specific disclosures + e-signature",
    outcome: "Legal warranty registration process that customers can complete in <5 minutes"
  },
  "Train team on US-specific processes": {
    why: "UK team needs to understand California regulations and customer expectations",
    how: "Training sessions: California warranty law, claims differences, support scripts, escalation",
    outcome: "Team confident handling US customers and compliant with regulations"
  },
  
  // Personal Relocation project
  "Finalize L1A visa approval": {
    why: "Legal authorization to live and work in US",
    how: "Respond to any USCIS requests, attend interview if required, receive approval notice",
    outcome: "L1A visa approved with 1-3 year validity"
  },
  "Secure housing in Laguna Beach area": {
    why: "Family needs place to live before visa expires",
    how: "Search: 3-bed, close to good school for Rupert, <$6K/month rent - use realtor if needed",
    outcome: "Signed lease with move-in date confirmed"
  },
  "Arrange school enrollment for Rupert": {
    why: "He'll need school when you arrive (not negotiable)",
    how: "Research schools in area, complete enrollment paperwork, arrange school tour",
    outcome: "Rupert enrolled with confirmed start date"
  },
  "Plan family move logistics": {
    why: "Can't just show up - need belongings, flights, temporary accommodation sorted",
    how: "Book: international moving company, flights, 2-week Airbnb for buffer, car rental",
    outcome: "Detailed move plan with dates, costs, and all bookings confirmed"
  },
  "Execute move to California": {
    why: "Physical relocation to begin US operations",
    how: "Fly to California, move into housing, get family settled, set up utilities/services",
    outcome: "Family relocated and settled in California"
  },
  "Initial local business networking (3-5 meetings)": {
    why: "Build local connections for business development and support",
    how: "Attend automotive networking events, dealer associations, introduce yourself to 3-5 key people",
    outcome: "Initial California business network established"
  },
  
  // Platform Client Expansion project
  "Create case study from first 3 platform clients": {
    why: "Proven success stories accelerate sales with new prospects",
    how: "Interview clients: before metrics, implementation, after results - get testimonials",
    outcome: "3 case studies showing platform value across different business types"
  },
  "Outreach to 10 automotive warranty providers": {
    why: "Expand beyond dealers into warranty administrator market",
    how: "Target independent warranty companies, franchise networks - personalized outreach",
    outcome: "3-5 qualified automotive warranty prospects in pipeline"
  },
  "Outreach to 10 non-automotive sectors (appliances, electronics, construction)": {
    why: "Diversify revenue beyond automotive market",
    how: "Research warranty providers in appliances, electronics, construction equipment - demonstrate transferability",
    outcome: "3-5 qualified non-automotive prospects in pipeline"
  },
  "Close 2 additional platform clients": {
    why: "Grow MRR and validate platform scales beyond pilots",
    how: "Work pipeline: demos → proposals → contracts → onboarding",
    outcome: "2 more paying clients live, £10-15K/mo additional MRR"
  },
  "Design referral/partner program": {
    why: "Leverage existing customers to generate qualified leads",
    how: "Structure: 10-15% revenue share for 12 months on referred clients + co-marketing benefits",
    outcome: "Referral program that incentivizes customers to sell on your behalf"
  },
  "Launch partner referral program": {
    why: "Turn customers into active sales channel",
    how: "Create partner portal, promotional materials, tracking system, payment automation",
    outcome: "Referral program generating 2-3 qualified leads per month"
  },
  
  // Dealer Network Expansion project
  "Identify 10 additional California dealers": {
    why: "Expand dealer network beyond initial pilots",
    how: "Target: LA, San Diego, Bay Area dealers (exotic/classic/performance focus)",
    outcome: "List of 10 qualified California dealer prospects with warm intro paths"
  },
  "Outreach to LA/San Diego/Bay Area dealers": {
    why: "Geographic expansion across major California markets",
    how: "Personalized outreach: reference local pilot dealers, emphasize platform benefits",
    outcome: "5-7 dealers interested in discovery calls"
  },
  "Close 3-5 additional dealer partnerships": {
    why: "Scale dealer network to create network effect",
    how: "Faster onboarding using refined process, leverage existing dealer testimonials",
    outcome: "3-5 new dealers live, £15-25K/mo additional MRR"
  },
  
  // Platform Feature Development project
  "Integrate Claims Scanner for all platform clients": {
    why: "Automated claims assessment reduces manual work and improves consistency",
    how: "Deploy Claims Scanner as feature flag per tenant, train clients on usage",
    outcome: "All clients have AI-powered claims assessment reducing processing time 60%"
  },
  "Build REST API for platform integrations": {
    why: "Customers want to connect platform to their existing tools (DMS, CRM, accounting)",
    how: "REST API with OAuth, rate limiting, webhooks for key events (new claim, payment)",
    outcome: "Public API docs that developers can integrate in <1 day"
  },
  "Build advanced analytics dashboard": {
    why: "Dealers need deeper insights to optimize warranty offerings and pricing",
    how: "Advanced metrics: lifetime value by vehicle segment, claim predictability, fraud patterns",
    outcome: "Dealers make data-driven decisions that increase profitability 15-20%"
  },
  "Implement fraud detection rules engine": {
    why: "Detect fraudulent claims before they cost money",
    how: "ML model + rules: flag suspicious patterns (repeat claimants, unusual timing, high-value claims)",
    outcome: "Fraud detection catching 70%+ of fraudulent claims before payout"
  },
  "Design mobile app support (iOS/Android)": {
    why: "Dealers and inspectors need mobile access for field work",
    how: "Native apps: photo upload, inspection checklists, claim submission, offline sync",
    outcome: "Mobile apps enabling field operations without laptop dependency"
  }
};

async function addDescriptions() {
  const tasks = await prisma.task.findMany({
    where: { workspaceId: 'dfd6d384-9e2f-4145-b4f3-254aa82c0237' }
  });
  
  let updated = 0;
  for (const task of tasks) {
    const desc = taskDescriptions[task.title];
    if (desc) {
      const description = `**Why:** ${desc.why}\n\n**How:** ${desc.how}\n\n**Outcome:** ${desc.outcome}`;
      await prisma.task.update({
        where: { id: task.id },
        data: { description }
      });
      updated++;
      console.log(`✓ ${task.title}`);
    }
  }
  
  console.log(`\nUpdated ${updated} tasks`);
  await prisma.$disconnect();
}

addDescriptions().catch(console.error);
