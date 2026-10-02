import { useState } from 'react'
import Footer from '../components/Footer'
import Navbar from '../components/Navbar'
import { Icon } from '../components/Icons'
import '../styles/informational-pages.css'

const founderEmail = 'shivam2000123@gmail.com'
const founderPhone = '+91 9334177552'
const mailLink = `mailto:${founderEmail}`
const phoneLink = 'tel:+919334177552'

function PageFrame({ kicker, title, intro, children, className = '' }) {
  return <div className="site-page"><Navbar /><main className={`info-page ${className}`}>
    <header className="info-heading"><p className="eyebrow eyebrow-orange">{kicker}</p><h1>{title}</h1><p>{intro}</p></header>
    {children}
  </main><Footer /></div>
}

function FounderContact() {
  return <div className="info-contact-links"><a href={mailLink}><Icon name="arrow" size={15} />{founderEmail}</a><a href={phoneLink}><Icon name="arrow" size={15} />{founderPhone}</a></div>
}

export function AboutPage() {
  const roles = ['Customers', 'Contractors', 'Workers', 'Machine Owners', 'Water Tanker Owners', 'Material Suppliers']
  return <PageFrame kicker="About Thekedar" title={<>THEKEDAR<em> Construction, Connected.</em></>} intro="A construction marketplace bringing project needs and local providers into one place." className="about-page">
    <section className="about-intro"><p>Thekedar helps people discover construction services, skilled workers, equipment, water tankers, and construction materials through one platform. It gives customers and contractors a place to explore available resources and send booking requests, while providers can present their listings to people looking for them.</p><p>Our aim is to make the process of finding the right people and resources for a project more direct and easier to coordinate.</p></section>
    <section className="about-community" aria-labelledby="about-community-title"><div><p className="eyebrow eyebrow-orange">One marketplace</p><h2 id="about-community-title">Built around the people who move projects forward.</h2></div><div className="about-role-grid">{roles.map((role, index) => <div className="about-role" key={role}><span>0{index + 1}</span><strong>{role}</strong></div>)}</div></section>
    <section className="founder-panel"><div><p className="eyebrow eyebrow-orange">The person behind Thekedar</p><h2>Shivam Kumar</h2><p>Founder &amp; Website Owner</p></div><FounderContact /></section>
  </PageFrame>
}

export function ContactPage() {
  const [notice, setNotice] = useState('')
  const handleSubmit = (event) => {
    event.preventDefault()
    setNotice('This form does not send messages yet. Please contact us directly using the email or phone number above.')
  }

  return <PageFrame kicker="Contact" title="Contact Thekedar" intro="Questions or feedback? Reach the founder directly." className="contact-page">
    <div className="contact-layout">
      <section className="contact-details"><p className="eyebrow eyebrow-orange">Founder &amp; Website Owner</p><h2>Shivam Kumar</h2><p className="contact-detail-row"><span>Email</span><a href={mailLink}>{founderEmail}</a></p><p className="contact-detail-row"><span>Phone</span><a href={phoneLink}>{founderPhone}</a></p><p className="contact-note">For account or marketplace questions, include enough context for us to understand your request. Do not send passwords or verification codes.</p></section>
      <form className="contact-form" onSubmit={handleSubmit}><p className="eyebrow eyebrow-orange">Send a message</p><h2>How can we help?</h2><p className="contact-form-note">This form is frontend-only and does not send or store messages. Contact us directly using the details shown here.</p><label className="info-label">Name<input name="name" autoComplete="name" required maxLength="120" /></label><label className="info-label">Email<input name="email" type="email" autoComplete="email" required maxLength="254" /></label><label className="info-label">Subject<input name="subject" required maxLength="160" /></label><label className="info-label">Message<textarea name="message" rows="5" required maxLength="3000" /></label>{notice && <p className="contact-form-notice" role="status">{notice}</p>}<button type="submit" className="button">Send message <Icon name="arrow" size={16} /></button></form>
    </div>
  </PageFrame>
}

const helpGroups = [
  {
    title: 'Account & Authentication',
    questions: [
      ['How do I create an account?', 'Choose Sign up, enter your account details, and select the appropriate customer, contractor, or provider role offered during registration.'],
      ['How do I log in?', 'Open Log in and use the email address and password associated with your account.'],
      ['How do I reset my password?', 'Choose Forgot password on the login page and follow the reset link sent to your account email.'],
      ['How do I change my profile?', 'After logging in, open your profile from the Navbar. You can update your name, phone, location, address, bio, and profile image. Your role and account email are not editable there.'],
    ],
  },
  {
    title: 'Marketplace',
    questions: [
      ['How do I find a machine?', 'Open Find Machines to browse listings and use the available search and filters. Open a listing for details.'],
      ['How do I find a worker?', 'Open Workers to view worker profiles, then open a profile to see availability and request information.'],
      ['How do I find a tanker?', 'Open Tankers to browse available water tanker listings and view their details.'],
      ['How do I find construction materials?', 'Open Materials to browse supplier listings, categories, locations, and availability.'],
      ['How do I list my service or product?', 'Use the relevant provider workspace when available: worker profile, machine listing, tanker profile, or material profile. Access depends on the role on your account.'],
    ],
  },
  {
    title: 'Bookings',
    questions: [
      ['How do I request a booking?', 'Open an eligible listing and follow its request flow. Machine requests can be prepared through Project Cart. Review dates, quantity, and notes before submitting.'],
      ['How can I accept or reject a request?', 'Providers with booking-request access can open Booking Requests and use the status controls available for that booking.'],
      ['How can I cancel a booking?', 'Open your booking list or booking details. Cancellation is available only while the booking status allows it.'],
      ['Where can I see my bookings?', 'Customers and contractors can open My Projects or Bookings. Providers can use the booking-request workspace available to their account.'],
    ],
  },
  {
    title: 'Project Cart',
    questions: [
      ['What is Project Cart?', 'Project Cart collects machine listings so you can prepare related booking requests together.'],
      ['How do I add items?', 'From a machine listing, choose Add to project. You can review the selected machines in My Projects.'],
      ['How do I remove items?', 'Open My Projects and remove a machine from the cart before submitting the requests.'],
    ],
  },
  {
    title: 'Reviews',
    questions: [
      ['When can I leave a review?', 'A review can be submitted from the booking details page after the related booking is marked Completed.'],
      ['How do ratings work?', 'A reviewer selects a rating from 1 to 5 and may add a comment. Marketplace ratings summarize reviews associated with the relevant listing.'],
    ],
  },
]

export function HelpPage() {
  return <PageFrame kicker="Help & Support" title="How can we help?" intro="Quick answers for using Thekedar." className="help-page">
    <div className="help-groups">{helpGroups.map((group) => <section className="help-group" key={group.title}><h2>{group.title}</h2><div className="help-questions">{group.questions.map(([question, answer]) => <details className="help-question" key={question}><summary>{question}<Icon name="chevron" size={17} /></summary><p>{answer}</p></details>)}</div></section>)}</div>
    <section className="help-contact"><div><p className="eyebrow eyebrow-orange">Still need a hand?</p><h2>Contact support</h2></div><FounderContact /></section>
  </PageFrame>
}

const termsSections = [
  ['Introduction', 'These Terms describe the basic conditions for accessing and using Thekedar, a marketplace for discovering construction services, workers, equipment, tankers, and materials.'],
  ['Acceptance of Terms', 'By accessing or using Thekedar, you agree to these Terms. If you do not agree, do not use the platform.'],
  ['User Accounts', 'You are responsible for maintaining accurate account information and keeping your sign-in credentials private. Account access is personal; do not share passwords or verification codes.'],
  ['User Responsibilities', 'You are responsible for information you submit, the listings you publish, and the agreements you make with other users. Verify identities, availability, scope, dates, and terms before proceeding.'],
  ['Marketplace Listings', 'Providers are responsible for the accuracy and availability of their listings. Thekedar does not independently guarantee listing descriptions, qualifications, stock, equipment condition, or service quality.'],
  ['Bookings and Requests', 'A booking request is a coordination record and may require acceptance or other follow-up. Users should confirm the final scope, schedule, quantity, and terms directly with the other party.'],
  ['Payments and Transactions', 'Thekedar does not currently process or hold marketplace payments. Users are responsible for agreeing on payment terms and handling any transaction directly with the other party.'],
  ['Reviews and Ratings', 'Reviews should reflect genuine experiences related to completed bookings. Do not post misleading, abusive, private, or unlawful content. Ratings are user-submitted and are not guarantees of future performance.'],
  ['Prohibited Activities', 'Do not misuse the platform, impersonate another person, submit false information, interfere with accounts or listings, or use Thekedar for unlawful or harmful activity.'],
  ['Platform Availability', 'Features may change, be interrupted, or become unavailable. Thekedar does not promise uninterrupted access or that every listing will remain available.'],
  ['Limitation of Liability', 'Thekedar provides a marketplace for discovery and coordination. Users make their own decisions and agreements. To the extent permitted by applicable law, Thekedar is not responsible for disputes, losses, service outcomes, or agreements between users. The platform does not provide legal, financial, insurance, construction, or professional guarantees.'],
  ['Changes to Terms', 'These Terms may be updated as the platform changes. The current version on this page applies to your continued use after publication.'],
]

export function TermsPage() {
  return <DocumentPage kicker="Terms" title="Terms & Conditions" intro="The terms for using Thekedar and its marketplace services." sections={termsSections} footerTitle="Thekedar" />
}

const privacySections = [
  ['Information We Collect', 'The information described here is information the application uses when you create an account, maintain a profile, publish or browse listings, make booking requests, save favorites, or submit reviews.'],
  ['Account Information', 'Account records include information such as your name, email address, phone number when provided, and account role. Authentication is handled through Supabase Auth; Thekedar does not store or display your password in its profile pages.'],
  ['Profile Information', 'You may provide profile details including your name, phone, city, state, address, bio, and profile image. Your profile page is for your account; only fields intentionally included in marketplace-facing provider views are shown to other users.'],
  ['Marketplace and Listing Information', 'Provider listings may include service or product descriptions, category or trade, location, availability, rates or prices, and listing images where supported. Do not include information you do not want to share through a listing.'],
  ['Booking Information', 'Booking records include participants, listing type and ID, requested dates, quantity, total price, status, and optional notes entered for the booking. Booking details are available to the relevant participants and authorized administrators under the application’s access rules.'],
  ['Reviews and Ratings', 'Reviews contain a rating, optional comment, related booking, reviewer, reviewed provider, and submission time. Marketplace views display rating information and comments without exposing reviewer contact details.'],
  ['How We Use Information', 'Information is used to operate accounts, display marketplace listings, coordinate booking requests, show reviews and ratings, manage favorites and notifications, and maintain the platform.'],
  ['Authentication and Account Security', 'Supabase Auth manages sign-in sessions. Keep your credentials private and sign out on shared devices. Thekedar does not ask you to send passwords or authentication codes to support.'],
  ['Data Storage', 'The application stores profile, marketplace, booking, review, favorite, and notification records in Supabase. Supported profile and listing images use private Supabase Storage buckets and access controls.'],
  ['Third-Party Services', 'Thekedar uses Supabase for authentication, database, and supported file storage. Requests to these services are subject to their own service terms and privacy practices. The application does not describe analytics or advertising tracking that it does not implement.'],
  ['Cookies / Local Storage', 'The Supabase client persists the authentication session in browser storage so you can remain signed in. The application does not claim to use advertising cookies. Browser settings can clear local storage, which may sign you out.'],
  ['Data Retention', 'Records are retained as needed to operate the account and related platform features. Booking and review records may remain associated with platform activity. Contact us with questions about information linked to your account.'],
  ['User Rights', 'You can update supported profile fields and manage your own favorites through the application. For questions or requests about account information, contact the site owner using the details below.'],
  ['Children’s Privacy', 'Thekedar is intended for people using construction and marketplace services, not for children. Contact us if you believe a child has submitted personal information so we can review the request.'],
  ['Changes to Privacy Policy', 'This page may be updated as Thekedar changes. The current version describes the application’s practices at the time it is published.'],
]

export function PrivacyPage() {
  return <DocumentPage kicker="Privacy" title="Privacy Policy" intro="How Thekedar uses information needed to provide the marketplace." sections={privacySections} footerTitle="Contact Us" />
}

function DocumentPage({ kicker, title, intro, sections, footerTitle }) {
  return <PageFrame kicker={kicker} title={title} intro={intro} className="legal-page">
    <div className="legal-document">{sections.map(([heading, body], index) => <section className="legal-section" key={heading}><span>{String(index + 1).padStart(2, '0')}</span><div><h2>{heading}</h2><p>{body}</p></div></section>)}
      <section className="legal-contact"><div><p className="eyebrow eyebrow-orange">{footerTitle}</p><h2>Thekedar</h2><p>Founder &amp; Website Owner: Shivam Kumar</p></div><FounderContact /></section>
    </div>
  </PageFrame>
}