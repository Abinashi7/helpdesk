import { TicketCategory, TicketStatus, ReplySenderType } from '../generated/prisma/client.js';
import { prisma } from '../src/lib/db.js';
import { SEED_MESSAGE_PREFIX, firstName, pick, rng, seedAuthors, shuffle } from './seed-utils.js';

const tickets = [
  // Billing — open
  { subject: 'Charged twice for the same invoice', fromName: 'Alice Mercer', fromEmail: 'alice.mercer@techcorp.io', category: TicketCategory.billing, status: TicketStatus.open, body: "Hi, I was charged twice for invoice #INV-2024-0392 on March 15th. Both charges of $149 appear on my credit card statement. Please refund the duplicate charge. My account ID is TC-8821." },
  { subject: 'Unexpected charge on my account', fromName: 'Derek Huang', fromEmail: 'derek.h@globalmedia.com', category: TicketCategory.billing, status: TicketStatus.open, body: "I noticed a $29.99 charge on my statement labeled 'HELPDESK PRO ADDON' that I never authorized. I only subscribed to the Basic plan. Can you explain this charge and issue a refund?" },
  { subject: 'Upgrade to annual plan — prorated credit?', fromName: 'Sophie Laurent', fromEmail: 'slaurent@designhub.fr', category: TicketCategory.billing, status: TicketStatus.open, body: "I'm currently on a monthly plan and want to switch to annual billing. Will I receive prorated credit for the remaining days of my current month? And how much does the annual plan cost?" },
  { subject: 'Invoice not received for February', fromName: 'James Okafor', fromEmail: 'james.okafor@consultplus.ng', category: TicketCategory.billing, status: TicketStatus.pending, body: "I haven't received my invoice for February 2024. I need it for accounting purposes. My billing email is finance@consultplus.ng. Can you resend it or provide a download link?" },
  { subject: 'Request for W-9 form', fromName: 'Maria Gonzalez', fromEmail: 'mgonzalez@acmeretail.com', category: TicketCategory.billing, status: TicketStatus.closed, body: "Our accounts payable team requires a W-9 form before we can process vendor payments. Could you please provide your current W-9? We need it by end of this week." },
  { subject: 'Discount for non-profit organization', fromName: 'Thomas Webb', fromEmail: 't.webb@hopefoundation.org', category: TicketCategory.billing, status: TicketStatus.open, body: "We're a registered 501(c)(3) non-profit. Do you offer a discount or special pricing for non-profits? We're currently evaluating plans for a team of 12 agents." },
  { subject: 'Credit card expiring — how to update?', fromName: 'Nina Petrov', fromEmail: 'nina.petrov@retailzone.bg', category: TicketCategory.billing, status: TicketStatus.closed, body: "My credit card on file expires at the end of the month. I updated it in the billing settings but want to confirm the new card will be charged on the next cycle and not the old one." },
  { subject: 'Cancel subscription and request refund', fromName: 'Liam O\'Brien', fromEmail: 'liam.obrien@startupx.ie', category: TicketCategory.billing, status: TicketStatus.closed, body: "I'd like to cancel my subscription effective immediately and request a prorated refund for the unused portion of this month. Account email: liam.obrien@startupx.ie. Please confirm when done." },
  { subject: 'Tax exemption certificate submission', fromName: 'Rachel Kim', fromEmail: 'rkim@edu-district.gov', category: TicketCategory.billing, status: TicketStatus.pending, body: "As a government entity we are tax-exempt. I'm attaching our tax exemption certificate. Please apply this to our account so future invoices do not include sales tax. Account #: EDU-44129." },
  { subject: 'Need itemized receipt for expense report', fromName: 'Carlos Mendes', fromEmail: 'c.mendes@lawfirm.br', category: TicketCategory.billing, status: TicketStatus.closed, body: "I need an itemized receipt for the payment made on January 22nd ($299.00) for our expense reporting system. The general invoice doesn't have enough detail. Can you provide a breakdown?" },

  // Billing — more
  { subject: 'Failed payment — card declined', fromName: 'Priya Nair', fromEmail: 'priya.nair@fintech.in', category: TicketCategory.billing, status: TicketStatus.open, body: "I received a notice that my payment failed and my account is at risk of suspension. I've updated my card but the retry hasn't happened yet. Can you manually trigger the charge or tell me when it will retry?" },
  { subject: 'Switch billing from USD to EUR', fromName: 'Florian Becker', fromEmail: 'florian@mediagmbh.de', category: TicketCategory.billing, status: TicketStatus.pending, body: "We are a German company and would prefer to be billed in EUR to avoid currency conversion fees. Is it possible to switch our billing currency? Our account is currently billed in USD." },
  { subject: 'Where is my refund?', fromName: 'Amara Diallo', fromEmail: 'amara.d@africomm.sn', category: TicketCategory.billing, status: TicketStatus.open, body: "I requested a refund on March 3rd and was told it would arrive within 5–7 business days. It's been 12 days and I still haven't received it. Order #REF-20240303-881. Please investigate." },

  // Technical — open
  { subject: 'Cannot import CSV of contacts', fromName: 'Brad Wilson', fromEmail: 'brad.wilson@salesteam.com', category: TicketCategory.technical, status: TicketStatus.open, body: "I'm trying to import a CSV of contacts but keep getting the error 'Invalid file format' even though I'm using the template you provide. The file has 847 rows. I've tried both Chrome and Firefox." },
  { subject: 'Email replies not threading correctly', fromName: 'Yuki Tanaka', fromEmail: 'yuki.tanaka@support.jp', category: TicketCategory.technical, status: TicketStatus.open, body: "When customers reply to our ticket emails, the replies are creating new tickets instead of appending to the existing conversation. This started happening two days ago. We're using the Mailgun integration." },
  { subject: 'API rate limit hit unexpectedly', fromName: 'Kwame Asante', fromEmail: 'k.asante@devafrica.gh', category: TicketCategory.technical, status: TicketStatus.pending, body: "Our integration is hitting the API rate limit even though we're well within the documented 1000 req/hr limit. We're seeing 429 responses at around 200 requests. Is there a per-minute sub-limit not documented?" },
  { subject: 'Webhook not firing on ticket close', fromName: 'Elena Vasquez', fromEmail: 'elena.v@devops-studio.mx', category: TicketCategory.technical, status: TicketStatus.open, body: "I configured a webhook to fire when tickets are closed, but it's not triggering. The webhook works fine for ticket creation events. I've triple-checked the URL and secret. Endpoint: https://hooks.devops-studio.mx/helpdesk" },
  { subject: 'SAML SSO login loop', fromName: 'Henrik Lindqvist', fromEmail: 'h.lindqvist@enterprise.se', category: TicketCategory.technical, status: TicketStatus.pending, body: "Users authenticating via our SAML SSO are getting stuck in a login loop after the IdP redirects back. The issue affects about 30% of users. Others can log in fine. Our IdP is Okta." },
  { subject: 'Search returns no results for keywords with accents', fromName: 'Isabelle Moreau', fromEmail: 'i.moreau@frenchco.fr', category: TicketCategory.technical, status: TicketStatus.open, body: "When agents search for tickets containing French words with accents (é, à, ç), the search returns nothing even though those tickets exist. Searching without accents finds them. Is this a known bug?" },
  { subject: 'Attachment upload fails for files over 5MB', fromName: 'Omar Al-Rashid', fromEmail: 'omar.r@logistics.ae', category: TicketCategory.technical, status: TicketStatus.closed, body: "Agents are unable to attach files larger than 5MB to tickets. The upload spins for a minute and then fails silently. We need to attach technical diagrams that are 10–20MB. Is there a size limit I can adjust?" },
  { subject: 'Auto-reply sent twice to customers', fromName: 'Sven Eriksson', fromEmail: 's.eriksson@nordic-support.no', category: TicketCategory.technical, status: TicketStatus.closed, body: "Since yesterday, every new ticket triggers two auto-reply emails to the customer. I've checked our automation rules and there's only one rule configured. Could this be a system-level issue?" },
  { subject: 'Can\'t change ticket assignee from mobile', fromName: 'Fatima Al-Zahra', fromEmail: 'fatima.z@mobileco.ma', category: TicketCategory.technical, status: TicketStatus.open, body: "On the mobile web version, when I tap the assignee dropdown on a ticket, it opens briefly and then closes without letting me select anyone. Works fine on desktop. iOS Safari 17.3." },
  { subject: 'Dark mode text unreadable on some screens', fromName: 'Dani Park', fromEmail: 'dani.park@uxagency.kr', category: TicketCategory.technical, status: TicketStatus.pending, body: "In dark mode, the text in ticket body previews on the list view is nearly invisible — dark gray text on a dark background. This affects the ticket list and the notification dropdown. Chrome 123 on Windows 11." },
  { subject: 'Integration with Salesforce failing after OAuth refresh', fromName: 'Marcus Thompson', fromEmail: 'm.thompson@saasco.com', category: TicketCategory.technical, status: TicketStatus.open, body: "Our Salesforce integration stopped syncing 3 days ago. The error log shows 'OAuth token refresh failed: invalid_grant'. We haven't changed anything on our end. Our Salesforce org ID is 00D4x0000008abc." },
  { subject: 'Bulk close action not working for filtered view', fromName: 'Anya Singh', fromEmail: 'anya.s@customerops.in', category: TicketCategory.technical, status: TicketStatus.closed, body: "When I filter tickets by category and then use 'select all' to bulk-close them, it closes tickets from the full unfiltered list, not just the ones in the filtered view. This caused us to accidentally close 200 tickets." },
  { subject: 'SLA timer not pausing on pending status', fromName: 'Roberto Ferrara', fromEmail: 'r.ferrara@italiantel.it', category: TicketCategory.technical, status: TicketStatus.pending, body: "According to your docs, SLA timers should pause when a ticket is set to Pending. But our SLA breach alerts are still firing for pending tickets. This started after last week's update." },
  { subject: 'Knowledge base articles not indexed in search', fromName: 'Chloé Dupont', fromEmail: 'chloe.d@helpcenter.be', category: TicketCategory.technical, status: TicketStatus.open, body: "Articles published in our knowledge base are not showing up in the in-app search results for agents. They're visible when browsing the KB directly, but the search bar doesn't find them. They've been published for 2 weeks." },

  // Technical — more
  { subject: 'Two-factor authentication codes not arriving', fromName: 'Aiden Murphy', fromEmail: 'aiden.m@irishtech.ie', category: TicketCategory.technical, status: TicketStatus.open, body: "Several agents are not receiving 2FA SMS codes when logging in. The codes sometimes arrive 10–15 minutes late, after the 5-minute expiry window. This is locking people out. We're using SMS-based 2FA." },
  { subject: 'Reports export is empty', fromName: 'Sun Li', fromEmail: 'sunli@datatechgroup.cn', category: TicketCategory.technical, status: TicketStatus.closed, body: "When I export the ticket volume report for Q1 2024 as CSV, the file downloads but contains only the header row and no data. The same report displays correctly in the UI. Tried 3 times." },
  { subject: 'Custom fields not saving on ticket update', fromName: 'Nadia Kowalski', fromEmail: 'nadia.k@e-commerce.pl', category: TicketCategory.technical, status: TicketStatus.pending, body: "Our custom field 'Order Number' loses its value when another agent edits the ticket and saves. The field goes blank. We noticed this causes lost data in our workflow. Custom field ID: cf_order_number." },
  { subject: 'Notification emails going to spam', fromName: 'Tobias Müller', fromEmail: 'tobias.m@shopware.de', category: TicketCategory.technical, status: TicketStatus.open, body: "Ticket notification emails are landing in our customers' spam folders. We've verified our SPF and DKIM records are correct. Can you confirm what the sending domain is so we can add it to our customers' allowlists?" },

  // Account — open
  { subject: 'Need to transfer account ownership', fromName: 'Grace Chen', fromEmail: 'grace.chen@techinc.tw', category: TicketCategory.account, status: TicketStatus.open, body: "Our original account owner has left the company and we need to transfer ownership to me. I'm the current IT Manager. The original owner's email was david.wu@techinc.tw. How do I initiate this transfer?" },
  { subject: 'Locked out — forgot password and 2FA device lost', fromName: 'Patrick Brennan', fromEmail: 'p.brennan@consulting.ie', category: TicketCategory.account, status: TicketStatus.pending, body: "I'm completely locked out of my account. I forgot my password and the phone with my 2FA app was stolen last week. I've tried the recovery codes but they don't work. My account email is p.brennan@consulting.ie." },
  { subject: 'Add team member to account', fromName: 'Mia Johnson', fromEmail: 'mia.j@startuplab.us', category: TicketCategory.account, status: TicketStatus.closed, body: "I'd like to add Sarah Thompson (sarah.t@startuplab.us) as an agent on our account. We've already purchased a seat. Can you confirm she'll have access within the hour once added? We have a critical situation today." },
  { subject: 'Username change request', fromName: 'Victor Sousa', fromEmail: 'victor.s@porto-tech.pt', category: TicketCategory.account, status: TicketStatus.closed, body: "I'd like to change my display name from 'Victor S' to 'Victor Sousa' across the platform. Is this something I can do myself in settings, or do I need your team to change it? I don't see the option in my profile." },
  { subject: 'Account suspended — why?', fromName: 'Hana Yamamoto', fromEmail: 'hana.y@jpstore.jp', category: TicketCategory.account, status: TicketStatus.open, body: "My account was suspended today without any prior notification. I was in the middle of helping a customer. I haven't violated any terms of service. Account email: hana.y@jpstore.jp. Please restore access urgently." },
  { subject: 'Delete my account and all data (GDPR request)', fromName: 'Lukas Novak', fromEmail: 'lukas.n@privacyfirst.cz', category: TicketCategory.account, status: TicketStatus.pending, body: "Per GDPR Article 17, I am requesting the deletion of my account and all personal data you hold on me. Please confirm receipt of this request and provide a timeline. My account: lukas.n@privacyfirst.cz." },
  { subject: 'Export all my data', fromName: 'Amelia Brooks', fromEmail: 'amelia.b@creative.nz', category: TicketCategory.account, status: TicketStatus.open, body: "Under GDPR, I'd like to download all data associated with my account — tickets, profile info, billing history, and audit logs. Is there a self-service export option or do I need to request this manually?" },
  { subject: 'Team seat limit — can I exceed temporarily?', fromName: 'Ravi Patel', fromEmail: 'ravi.p@bharat-bpo.in', category: TicketCategory.account, status: TicketStatus.closed, body: "We're in peak season and need to add 5 temporary agents for 2 weeks, but we've hit our plan's seat limit. Can I add them temporarily and pay a prorated amount? Or do I need to upgrade the full plan?" },
  { subject: 'Two-step verification reset', fromName: 'Giulia Rossi', fromEmail: 'giulia.r@italianmoda.it', category: TicketCategory.account, status: TicketStatus.closed, body: "I set up 2FA on a device I no longer have access to. I can still log in with my password but the 2FA step is failing. Can you reset 2FA on my account so I can re-enroll with my new phone?" },
  { subject: 'Agent role permissions need adjustment', fromName: 'Felix Wagner', fromEmail: 'felix.w@autohaus.de', category: TicketCategory.account, status: TicketStatus.open, body: "Some of our agents should not have access to billing information. Is there a way to restrict what agents can see? Currently all agents can see the billing tab which is a concern. We're on the Business plan." },

  // Account — more
  { subject: 'Merge two accounts into one', fromName: 'Diana Okonkwo', fromEmail: 'diana.o@africatech.ng', category: TicketCategory.account, status: TicketStatus.pending, body: "We have two accounts — one personal (diana.o@africatech.ng) and one company (team@africatech.ng). We'd like to merge them into a single company account and preserve all tickets from both. Is this possible?" },
  { subject: 'Username already taken after company rebrand', fromName: 'Ethan Clarke', fromEmail: 'ethan.c@newbrand.co.uk', category: TicketCategory.account, status: TicketStatus.open, body: "Our company rebranded from Oldco to Newbrand. When I tried to update our account username to 'newbrand', it says it's already taken. The account holding it appears to be inactive. Can you help us claim it?" },
  { subject: 'Audit log download for compliance review', fromName: 'Yemi Adeleke', fromEmail: 'yemi.a@complianceafrica.ng', category: TicketCategory.account, status: TicketStatus.closed, body: "We need a full audit log export for the period January 1 – March 31, 2024 for a regulatory compliance review. Please include all agent actions, login events, and ticket changes. Account: complianceafrica.ng." },
  { subject: 'Cannot update company billing address', fromName: 'Ingrid Hansen', fromEmail: 'ingrid.h@nordicretail.no', category: TicketCategory.account, status: TicketStatus.pending, body: "I'm trying to update our billing address from our old Oslo office to the new Bergen location, but the field doesn't save — it reverts to the old address on page refresh. This is causing issues with our VAT invoices." },

  // General — open
  { subject: 'How do I set up business hours?', fromName: 'Kevin Park', fromEmail: 'kevin.p@supportteam.us', category: TicketCategory.general, status: TicketStatus.open, body: "I want to configure business hours so that our SLA timers only count during 9am–6pm EST, Monday to Friday. I found the settings page but I'm not sure how to handle multiple time zones for our distributed team." },
  { subject: 'Best practices for tagging tickets?', fromName: 'Layla Hassan', fromEmail: 'layla.h@ecommerce.ae', category: TicketCategory.general, status: TicketStatus.open, body: "We have a team of 15 agents and want to implement a consistent tagging strategy. Can you share any templates or best practices for organizing tags? We handle about 500 tickets/day across 4 product lines." },
  { subject: 'Is there a mobile app?', fromName: 'Aaron Nkomo', fromEmail: 'a.nkomo@mobileops.za', category: TicketCategory.general, status: TicketStatus.closed, body: "Do you have a native iOS or Android app for agents? We have field technicians who need to update ticket status on the go. If not, is the web app fully responsive on mobile?" },
  { subject: 'Onboarding checklist for new agents', fromName: 'Beatriz Santos', fromEmail: 'beatriz.s@suportebr.com.br', category: TicketCategory.general, status: TicketStatus.open, body: "I'm onboarding 8 new agents next Monday. Is there an official onboarding guide or checklist I can give them? Ideally something that covers the basics without overwhelming them on day one." },
  { subject: 'How to set up automatic ticket assignment?', fromName: 'Daniel Osei', fromEmail: 'd.osei@customersuccess.gh', category: TicketCategory.general, status: TicketStatus.pending, body: "I want tickets to be automatically assigned to agents based on their skill tags. For example, billing tickets go to the billing team. Is there a round-robin or skill-based routing option? Which plan includes this?" },
  { subject: 'Feature request: bulk tag update', fromName: 'Katarzyna Wójcik', fromEmail: 'k.wojcik@techpol.pl', category: TicketCategory.general, status: TicketStatus.closed, body: "Would it be possible to add a bulk tag update feature? Right now I have to open each ticket individually to add or remove tags. Being able to select multiple tickets and update tags at once would save us significant time." },
  { subject: 'What is the uptime SLA for the platform?', fromName: 'Leon Meyer', fromEmail: 'leon.m@corporatede.de', category: TicketCategory.general, status: TicketStatus.open, body: "I'm evaluating your platform for enterprise use. What is your uptime SLA and how is it measured? Do you have a status page I can subscribe to for incident notifications? Is there a paid support tier with a guaranteed response time?" },
  { subject: 'Request for a product demo', fromName: 'Valeria Torres', fromEmail: 'v.torres@latam-corp.mx', category: TicketCategory.general, status: TicketStatus.closed, body: "We're a company with 50 support agents and are evaluating helpdesk tools. I'd like to schedule a live demo with one of your product specialists. We're available any time this week or next week EST." },
  { subject: 'Training materials for supervisor role', fromName: 'Mohammed Al-Farsi', fromEmail: 'm.alfarsi@khalij.om', category: TicketCategory.general, status: TicketStatus.open, body: "I was just promoted to Support Supervisor and want to learn all the advanced features — reporting, SLA management, team performance dashboards. Do you offer video tutorials or a supervisor training course?" },
  { subject: 'Does the platform support Arabic (RTL)?', fromName: 'Nour Al-Amin', fromEmail: 'nour.a@arabsupport.sa', category: TicketCategory.general, status: TicketStatus.pending, body: "We need the interface to support Arabic language and right-to-left text direction. Our agents and customers are primarily Arabic speakers. Do you have Arabic localization and RTL UI support planned?" },

  // General — more
  { subject: 'How to generate a performance report for my team?', fromName: 'Olga Ivanova', fromEmail: 'olga.i@rutech.ru', category: TicketCategory.general, status: TicketStatus.open, body: "I want to generate a report showing each agent's ticket volume, average response time, and customer satisfaction scores for Q1. I found the Reports section but can't figure out how to filter by agent and export." },
  { subject: 'Can we integrate with Slack?', fromName: 'Finn O\'Sullivan', fromEmail: 'finn.o@slackuser.ie', category: TicketCategory.general, status: TicketStatus.closed, body: "We use Slack heavily and would love to receive ticket notifications and be able to reply from Slack. Is there a native Slack integration? I saw a mention in your docs but couldn't find setup instructions." },
  { subject: 'Multiple brands / inboxes support?', fromName: 'Adaeze Nwosu', fromEmail: 'adaeze.n@multibrands.ng', category: TicketCategory.general, status: TicketStatus.open, body: "We operate 3 different brands with separate support emails. Can we handle all three brands within a single account with separate inboxes and distinct customer-facing identities (from address, auto-reply templates)?" },

  // No category — various statuses
  { subject: 'Page not loading after latest update', fromName: 'Sam Carter', fromEmail: 'sam.c@webuser.com', category: null, status: TicketStatus.open, body: "After the update that went out yesterday, the main dashboard takes over 30 seconds to load and sometimes times out entirely. Other pages seem fine. Chrome 123, cleared cache, same issue in incognito." },
  { subject: 'Getting a 500 error on login', fromName: 'Emma Fischer', fromEmail: 'emma.f@techuser.at', category: null, status: TicketStatus.open, body: "I'm getting a 500 Internal Server Error when trying to log in. This started about an hour ago. Other team members can log in fine. I've tried different browsers and devices. Nothing has changed on my end." },
  { subject: 'Response time is very slow', fromName: 'Ben Nakamura', fromEmail: 'ben.n@japanuser.jp', category: null, status: TicketStatus.pending, body: "The platform has been very slow for the past 2 hours — pages take 5–10 seconds to load, ticket saves take up to 30 seconds. Is there an ongoing incident? We're in Tokyo. Other cloud services seem fine." },
  { subject: 'Possible data breach — please investigate', fromName: 'Claire Dubois', fromEmail: 'claire.d@securitywatch.fr', category: null, status: TicketStatus.pending, body: "I noticed unfamiliar login activity on my account from an IP address in a country where I don't operate. Two tickets were modified that I didn't touch. I've changed my password but am concerned. Please audit my account access logs." },
  { subject: 'Congratulations on the new UI!', fromName: 'Leo Andersen', fromEmail: 'leo.a@happycustomer.dk', category: null, status: TicketStatus.closed, body: "Just wanted to send a note to say the new interface is a huge improvement. The ticket list is much faster and the new shortcuts save a lot of time. The dark mode is really nice too. Keep up the great work!" },
  { subject: 'Can I get a referral code?', fromName: 'Zara Osei', fromEmail: 'zara.o@networker.gh', category: null, status: TicketStatus.closed, body: "I've been recommending your platform to everyone in my network. Do you have a referral program? I'd love a referral code to share. I've already gotten 2 companies to sign up but didn't know about a program at the time." },

  // More billing tickets
  { subject: 'Annual plan renewal price changed', fromName: 'Mikael Strand', fromEmail: 'mikael.s@nordico.se', category: TicketCategory.billing, status: TicketStatus.open, body: "I received my renewal notice and the price is 20% higher than last year. I don't see any announcement about a price increase. My contract didn't mention this was possible. Can you explain and honor last year's price?" },
  { subject: 'VAT not applied correctly on invoice', fromName: 'Petra Horak', fromEmail: 'petra.h@czechbusiness.cz', category: TicketCategory.billing, status: TicketStatus.pending, body: "Our invoices should show 21% Czech VAT, but the last 3 invoices show 0% VAT. We provided our CRN and VAT number when signing up. Can you correct the invoices and update the VAT setting on our account?" },
  { subject: 'Downgrade plan confirmation', fromName: 'Takeshi Kato', fromEmail: 'takeshi.k@smejapan.jp', category: TicketCategory.billing, status: TicketStatus.closed, body: "I downgraded our plan from Business to Starter last week. I just want to confirm the downgrade took effect and that I won't be charged for the Business plan next cycle. Our renewal date is the 1st of the month." },
  { subject: 'Request for multi-year discount', fromName: 'Chiara Bianchi', fromEmail: 'chiara.b@consulenzait.it', category: TicketCategory.billing, status: TicketStatus.open, body: "We've been on the platform for 3 years and are considering a 3-year prepaid commitment. Is there a discount available for multi-year contracts? We currently pay $499/month for the Business plan." },

  // More technical tickets
  { subject: 'API pagination returning duplicate records', fromName: 'Dmitri Volkov', fromEmail: 'dmitri.v@backend.ru', category: TicketCategory.technical, status: TicketStatus.open, body: "When paginating through the tickets API using cursor-based pagination, the same ticket appears in multiple pages. This happens with the GET /v2/tickets endpoint, page sizes of 50. The duplicated record always appears at page boundaries." },
  { subject: 'Canned responses disappearing', fromName: 'Ngozi Adeyemi', fromEmail: 'ngozi.a@helpdesk.ng', category: TicketCategory.technical, status: TicketStatus.closed, body: "We created about 40 canned responses last week. Today, 12 of them are gone. I checked the audit log and don't see any deletions. Other agents say they didn't delete them. Is there a backup or can they be restored?" },
  { subject: 'Email-to-ticket parsing broken for HTML emails', fromName: 'Lars Hoffmann', fromEmail: 'lars.h@devstudio.de', category: TicketCategory.technical, status: TicketStatus.pending, body: "HTML emails are not being parsed correctly when converted to tickets. The ticket body shows raw HTML tags instead of rendered text. Plain text emails work fine. This broke about a week ago — we didn't change anything." },
  { subject: 'Slow ticket search with more than 10k tickets', fromName: 'Ana Lima', fromEmail: 'ana.l@bigteam.br', category: TicketCategory.technical, status: TicketStatus.open, body: "Our account has over 10,000 tickets and search has become extremely slow — sometimes timing out entirely. A search that used to take 1 second now takes 15–20 seconds. Is there indexing or optimization we can enable?" },
  { subject: 'Zapier integration stops after 100 tickets', fromName: 'Sam Rodriguez', fromEmail: 'sam.r@automator.us', category: TicketCategory.technical, status: TicketStatus.pending, body: "Our Zapier integration syncs new tickets to our CRM, but it stops syncing after the first 100 tickets in a month. After that, new tickets don't trigger the Zap. Is there a cap on Zapier events in our plan?" },

  // More account tickets
  { subject: 'Change account email address', fromName: 'Amina Cissé', fromEmail: 'amina.c@westafricatech.ml', category: TicketCategory.account, status: TicketStatus.open, body: "I need to change the primary email on our account from amina.c@westafricatech.ml to admin@westafricatech.ml. I can't find this option in the profile settings. Can you walk me through the process or make the change?" },
  { subject: 'IP allowlisting for enterprise security policy', fromName: 'Markus Bauer', fromEmail: 'markus.b@bank.de', category: TicketCategory.account, status: TicketStatus.pending, body: "Our IT security policy requires restricting platform access to specific IP ranges. We need to allowlist our corporate IPs: 203.0.113.0/24 and 198.51.100.0/24. Is IP allowlisting available on the Enterprise plan?" },
  { subject: 'SSO configuration help needed', fromName: 'Jin-woo Park', fromEmail: 'jinwoo.p@koreacorp.kr', category: TicketCategory.account, status: TicketStatus.open, body: "We're trying to configure SSO with our Microsoft Azure AD tenant. I followed the documentation but am getting 'SAML assertion not valid' error. Our tenant ID is listed in our Azure AD settings. Can we schedule a call?" },
  { subject: 'Remove former employee access immediately', fromName: 'Sandra Bloom', fromEmail: 's.bloom@lawoffices.us', category: TicketCategory.account, status: TicketStatus.closed, body: "A former employee, Michael Torres (m.torres@lawoffices.us), left the company today under adverse circumstances. Please immediately revoke all access to our account. This is urgent — he had admin-level access." },

  // More general tickets
  { subject: 'Keyboard shortcut reference card', fromName: 'Hiroshi Yamada', fromEmail: 'hiroshi.y@jpagency.jp', category: TicketCategory.general, status: TicketStatus.open, body: "Is there a printable keyboard shortcut reference card I can share with my agents? They're struggling to remember all the shortcuts. Something one-page that covers the most common actions would be very helpful." },
  { subject: 'How to archive old tickets?', fromName: 'Sylvia Osei', fromEmail: 'sylvia.o@archiveit.gh', category: TicketCategory.general, status: TicketStatus.closed, body: "We have thousands of tickets from 2021 and 2022 that clutter the interface and slow down searches. Is there a way to archive old closed tickets while keeping them accessible for reference if needed?" },
  { subject: 'Can I white-label the customer portal?', fromName: 'Raj Mehta', fromEmail: 'raj.m@agencyin.in', category: TicketCategory.general, status: TicketStatus.pending, body: "We run the platform for multiple clients and want to white-label the customer portal with each client's logo and domain. Is this possible on the Agency or Enterprise plan? Can we suppress all references to your brand?" },
  { subject: 'Suggestions for reducing ticket volume', fromName: 'Chidinma Eze', fromEmail: 'chidinma.e@supportng.ng', category: TicketCategory.general, status: TicketStatus.open, body: "We handle about 300 tickets/day and want to reduce volume by improving our self-service options. Can you suggest which platform features (chatbot, knowledge base, FAQ popups) would be most effective for deflecting common questions?" },
  { subject: 'Partnership and reseller inquiry', fromName: 'Alexei Popov', fromEmail: 'alexei.p@itpartner.ru', category: TicketCategory.general, status: TicketStatus.closed, body: "We are an IT solutions provider in Russia and Eastern Europe and are interested in becoming a reseller of your platform. Could you put me in touch with your partnerships team? We have an existing client base of 200+ SMBs." },

  // More no-category
  { subject: 'Accessibility issue with screen reader', fromName: 'Maria dos Santos', fromEmail: 'maria.s@accessibility.br', category: null, status: TicketStatus.open, body: "As a visually impaired agent using JAWS screen reader, I'm finding the ticket list table difficult to navigate. The table headers are not being announced correctly and the sort buttons have no accessible labels. Can your team look at WCAG compliance?" },
  { subject: 'Wrong timezone shown in ticket timestamps', fromName: 'Femi Adesanya', fromEmail: 'femi.a@lagos-tech.ng', category: null, status: TicketStatus.pending, body: "All ticket timestamps show in UTC, but I've set my profile timezone to WAT (West Africa Time, UTC+1). The setting doesn't seem to apply to the ticket list or ticket detail view — only to some dashboard widgets." },
  { subject: 'Error when printing ticket details', fromName: 'Greta Lindahl', fromEmail: 'greta.l@swedish-law.se', category: null, status: TicketStatus.closed, body: "When I try to print a ticket (Ctrl+P), the print preview is completely blank. This is needed for legal documentation. It works for other pages in the browser. Chrome 123 on Windows 11. Has anyone else reported this?" },

  // Last few to reach 100
  { subject: 'Downtime during business hours — compensation?', fromName: 'Bruno Keller', fromEmail: 'bruno.k@swissbiz.ch', category: TicketCategory.billing, status: TicketStatus.open, body: "Your platform was down for 3 hours on April 2nd during our core business hours (9am–12pm CET). This caused significant disruption. Per our SLA, we're entitled to service credits. How do I submit a claim?" },
  { subject: 'Custom domain for customer portal not propagating', fromName: 'Lena Johansson', fromEmail: 'lena.j@nordic-ecom.se', category: TicketCategory.technical, status: TicketStatus.open, body: "I configured support.nordic-ecom.se as our custom domain for the customer portal 48 hours ago. DNS records are set correctly (verified with dig). The portal still shows your default domain. Is there additional configuration needed?" },
  { subject: 'Data residency — can data be stored in EU?', fromName: 'Klaus Bergmann', fromEmail: 'k.bergmann@gdpr-corp.de', category: TicketCategory.account, status: TicketStatus.pending, body: "Our legal team requires that all customer data be stored within the EU to comply with GDPR. Do you offer EU data residency? If so, which plan includes it and how do we migrate our existing data to an EU region?" },
  { subject: 'How to set escalation rules?', fromName: 'Patience Ama', fromEmail: 'patience.a@ghsupport.gh', category: TicketCategory.general, status: TicketStatus.open, body: "I want to set up automatic escalation so that if a ticket is open for more than 24 hours without a response, it gets flagged and the supervisor receives an alert. Where do I configure this and which plan supports it?" },
  { subject: 'Not receiving new ticket notifications', fromName: 'Ryan Kowalczyk', fromEmail: 'ryan.k@polandops.pl', category: TicketCategory.technical, status: TicketStatus.open, body: "I stopped receiving email notifications for new tickets assigned to me about 3 days ago. My notification settings look correct — email alerts are enabled for all ticket events. Other agents on my team receive theirs fine." },
  { subject: 'Account reactivation after lapse in payment', fromName: 'Taiwo Adewale', fromEmail: 'taiwo.a@nigeriaops.ng', category: TicketCategory.account, status: TicketStatus.closed, body: "Our account was suspended due to a payment failure caused by a bank issue. We've now updated our payment method and paid the outstanding balance. Can you reactivate our account? We have urgent tickets waiting. Account: nigeriaops.ng." },
  { subject: 'Reporting on first contact resolution rate', fromName: 'Siobhan Murphy', fromEmail: 'siobhan.m@irishsupport.ie', category: TicketCategory.general, status: TicketStatus.pending, body: "How do I measure first contact resolution rate using the built-in reports? I want to track how many tickets are resolved without the customer needing to reply again. Is this a standard metric in the Reports section?" },
  { subject: 'Holiday auto-reply setup', fromName: 'Katinka Bos', fromEmail: 'katinka.b@hollandco.nl', category: TicketCategory.general, status: TicketStatus.closed, body: "We want to set up an auto-reply for the upcoming public holidays (April 27 – May 5) informing customers of reduced support availability. How do I schedule an auto-reply with start/end dates that turns off automatically?" },
];

const DAYS = 30;
const HOUR = 3_600_000;

/** Share of terminal tickets that land in `resolved` rather than `closed`. */
const RESOLVED_SHARE = 0.55;
/** Share of terminal tickets credited to the AI. Bounded by NEVER_AUTO_RESOLVED below. */
const AI_SHARE = 0.5;

/**
 * Mirrors the escalation rules in `src/workers/autoResolve.ts` — refunds, chargebacks,
 * legal threats and account-security issues are never auto-answered. Seeded data must not
 * claim the AI resolved a ticket the real worker would have escalated to a human.
 */
const NEVER_AUTO_RESOLVED = new RegExp(
  [
    // refunds, chargebacks, billing disputes
    'refund', 'chargeback', 'charged twice', 'dispute', 'compensation', 'unauthoriz',
    // legal threats
    'legal', 'lawyer',
    // account security
    'security', 'breach', 'compromis', 'revoke', 'deactivate', 'suspend', 'reactivat',
    'former employee', 'offboard', 'admin-level', 'password', '2fa', 'two-factor', 'sso',
  ].join('|'),
  'i',
);

type SeedTicket = (typeof tickets)[number];

function isAutoResolvable(t: SeedTicket): boolean {
  // The classify worker runs before auto-resolve, so an untagged ticket never
  // reaches the AI answerer — those stay uncategorised and human-handled.
  if (!t.category) return false;
  return !NEVER_AUTO_RESOLVED.test(`${t.subject} ${t.body}`);
}

/**
 * One createdAt per ticket, spread across the trailing 30 days that
 * `getDailyVolume()` charts. Weekends are damped — a flat distribution reads as a
 * fixture rather than a support queue.
 */
function volumeCurve(random: () => number): Date[] {
  const midnight = new Date();
  midnight.setUTCHours(0, 0, 0, 0);

  const days = Array.from({ length: DAYS }, (_, i) => {
    const date = new Date(midnight);
    date.setUTCDate(date.getUTCDate() - (DAYS - 1 - i));
    const weekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;
    return { date, weight: (weekend ? 0.3 : 1) * (0.75 + random() * 0.5) };
  });

  const totalWeight = days.reduce((sum, d) => sum + d.weight, 0);
  const exact = days.map((d) => (d.weight / totalWeight) * tickets.length);
  const counts = exact.map(Math.floor);

  // Largest remainder, so the per-day counts sum to exactly tickets.length.
  const shortfall = tickets.length - counts.reduce((a, b) => a + b, 0);
  exact
    .map((value, index) => ({ index, frac: value - Math.floor(value) }))
    .sort((a, b) => b.frac - a.frac)
    .slice(0, shortfall)
    .forEach(({ index }) => counts[index]++);

  const now = Date.now();
  const stamps: Date[] = [];

  days.forEach((day, i) => {
    for (let n = 0; n < counts[i]; n++) {
      const at = new Date(day.date);
      at.setUTCHours(7 + Math.floor(random() * 12), Math.floor(random() * 60), Math.floor(random() * 60), 0);
      // Today's slot can overshoot the clock — pull those back into the recent past.
      if (at.getTime() > now) at.setTime(now - Math.floor(random() * 6 * HOUR));
      stamps.push(at);
    }
  });

  return stamps;
}

/** The auto-resolve worker answers within a minute of ingestion; humans take hours. */
function resolutionDelay(random: () => number, byAi: boolean): number {
  return byAi ? (0.5 + random() * 4) * 60_000 : (3 + random() * 45) * HOUR;
}

const AI_REPLIES: readonly string[] = [
  'Hi {first},\n\nThanks for reaching out about "{subject}". I checked this against our documentation and it is covered there in full — the relevant article walks through it step by step and applies to your current plan.\n\nIf you work through it and still run into trouble, just reply to this email and a member of the team will pick it up directly.\n\nBest regards,\nNorthwind Academy Support',
  'Hi {first},\n\nThanks for getting in touch. Our documentation covers "{subject}" directly, so I can answer this straight away: the setting you need is available on your plan, and the help centre article on this topic has the exact steps and screenshots.\n\nIf anything there does not match what you are seeing, reply here and an agent will take a closer look.\n\nBest regards,\nNorthwind Academy Support',
  'Hi {first},\n\nThanks for writing in. This one is documented — "{subject}" is covered in our help centre, and the article there answers it end to end without any changes needed on our side.\n\nDo reply to this email if the steps do not resolve it and a human agent will follow up.\n\nBest regards,\nNorthwind Academy Support',
];

/** Headings from knowledge-base.md, for backfilling what the AI would have cited. */
const KB_SECTIONS: readonly string[] = [
  '1. Account & Login Issues',
  '2. Course Access & Purchases',
  '3. Lifetime Access',
  '5. Certificates',
  '6. Downloading Content',
  '7. Technical Issues',
  '8. Coupon Codes',
  '9. Account Changes',
];

const AGENT_REPLIES: readonly string[] = [
  'Hi {first},\n\nThanks for your patience on this. I have reproduced what you described and passed the details to our engineering team — I will update you here as soon as I have something concrete.\n\nBest regards,\n{agent}',
  'Hi {first},\n\nI have looked into this on our side and applied the change to your account. Could you confirm it now behaves as you expect? If not, I will keep digging.\n\nBest regards,\n{agent}',
  'Hi {first},\n\nThanks for flagging this. I needed a little more detail before I could act — could you send the exact timestamp and the account ID you were signed in as when it happened?\n\nBest regards,\n{agent}',
];

function fill(template: string, values: { first: string; agent: string; subject: string }): string {
  return template
    .replace('{first}', values.first)
    .replace('{agent}', values.agent)
    .replace('{subject}', values.subject);
}

async function main() {
  const random = rng(20260825);
  const { ai, agent } = await seedAuthors();

  const removed = await prisma.ticket.deleteMany({
    where: { messageId: { startsWith: SEED_MESSAGE_PREFIX } },
  });
  if (removed.count > 0) console.log(`Cleared ${removed.count} previously seeded ticket(s).`);

  const stamps = volumeCurve(random);
  // Decouple the date from the authored ordering, so categories and statuses do not
  // arrive in blocks on the chart.
  const order = shuffle(random, tickets.map((_, i) => i));

  // The authored `closed` tickets are the pool of closed-out work. Split them into
  // resolved vs closed, and credit the AI only where the escalation rules allow it.
  const terminal = shuffle(
    random,
    tickets.map((t, i) => ({ t, i })).filter(({ t }) => t.status === TicketStatus.closed),
  );

  const aiTarget = Math.round(terminal.length * AI_SHARE);
  const aiResolved = new Set<number>();
  for (const { t, i } of terminal) {
    if (aiResolved.size >= aiTarget) break;
    if (isAutoResolvable(t)) aiResolved.add(i);
  }

  const markedResolved = new Set(
    terminal.slice(0, Math.round(terminal.length * RESOLVED_SHARE)).map(({ i }) => i),
  );

  const now = Date.now();
  let replyCount = 0;

  for (const [n, index] of order.entries()) {
    const t = tickets[index];
    const createdAt = stamps[n];
    const fillValues = { first: firstName(t.fromName), agent: agent.name, subject: t.subject };

    const isTerminal = t.status === TicketStatus.closed;
    const byAi = aiResolved.has(index);
    const status = isTerminal
      ? markedResolved.has(index)
        ? TicketStatus.resolved
        : TicketStatus.closed
      : t.status;

    const resolvedAt = isTerminal
      ? new Date(Math.min(createdAt.getTime() + resolutionDelay(random, byAi), now))
      : null;

    const replies: {
      body: string;
      senderType: ReplySenderType;
      createdAt: Date;
      updatedAt: Date;
      author: { connect: { id: string } };
    }[] = [];

    if (isTerminal && resolvedAt) {
      const at = byAi
        ? resolvedAt
        : new Date(createdAt.getTime() + (resolvedAt.getTime() - createdAt.getTime()) * 0.6);
      replies.push({
        body: byAi
          ? fill(pick(random, AI_REPLIES), fillValues)
          : fill(pick(random, AGENT_REPLIES), fillValues),
        senderType: ReplySenderType.agent,
        createdAt: at,
        updatedAt: at,
        author: { connect: { id: byAi ? ai.id : agent.id } },
      });
    } else if (t.status === TicketStatus.pending) {
      // `pending` means we are waiting on the customer, which implies an agent already replied.
      const at = new Date(Math.min(createdAt.getTime() + (1 + random() * 7) * HOUR, now));
      replies.push({
        body: fill(pick(random, AGENT_REPLIES), fillValues),
        senderType: ReplySenderType.agent,
        createdAt: at,
        updatedAt: at,
        author: { connect: { id: agent.id } },
      });
    }

    await prisma.ticket.create({
      data: {
        subject: t.subject,
        body: t.body,
        fromName: t.fromName,
        fromEmail: t.fromEmail,
        category: t.category ?? undefined,
        status,
        resolvedByAi: byAi,
        resolvedAt,
        // Only auto-resolved tickets carry the worker's own confidence; a human-handled
        // ticket never went through the AI answerer.
        ...(byAi && {
          aiConfidence: Math.round((0.86 + random() * 0.13) * 100) / 100,
          aiKbSection: pick(random, KB_SECTIONS),
        }),
        createdAt,
        updatedAt: resolvedAt ?? createdAt,
        messageId: `${SEED_MESSAGE_PREFIX}${index}@demo.helpdesk`,
        ...(replies.length > 0 && { replies: { create: replies } }),
      },
    });

    replyCount += replies.length;
  }

  const aiCount = aiResolved.size;
  const terminalCount = terminal.length;
  console.log(
    `Created ${tickets.length} tickets and ${replyCount} replies across the last ${DAYS} days.\n` +
      `  resolved/closed: ${terminalCount}  ·  resolved by AI: ${aiCount} ` +
      `(${Math.round((aiCount / terminalCount) * 100)}% of closed-out tickets)`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
