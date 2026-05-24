import { prisma } from '../src/lib/db.js';

const TICKET_ID = 102;
const AUTHOR_ID = 'xVa6Q4EdYUrHNygitN54VlWH1ZnZSEbK';

const customer: string[] = [
  // 1
  `Hello, thank you for the quick response. That is very helpful to know about the plan limits.

I have a few follow-up questions before I proceed. First, does each inbox correspond to one email address, or can a single inbox receive mail from multiple addresses?

Second, when you say shared ticket queue, does that mean agents handling our primary inbox will also see tickets from the returns address in the same view? I want to avoid any confusion about ownership on the team.

Third, our mail is hosted on Google Workspace. Is the forwarding rule configured from the Google Admin Console, or is the process different for Workspace accounts?

Finally, I want to confirm that adding the new inbox will not affect any of our existing open tickets. We have around 40 active tickets at the moment and I would not want the configuration change to disrupt anything.

I appreciate the clear explanation and look forward to your detailed setup instructions. We have been wanting to separate returns queries from general support for several months so this is very welcome news.`,

  // 2
  `Thank you for the detailed steps. I followed everything in the Google Admin Console and created the routing rule as described.

I sent a test email from my personal Gmail account to returns@kenyasupport.ke. However, in the Gmail delivery logs the email appears to have been forwarded to your ingestion address but was flagged as potential spam by Google before delivery.

No ticket appeared in our Helpdesk queue within the 60-second window you mentioned. It has now been about five minutes, so I suspect the spam flag is the cause.

I also want to flag that we already have an existing forwarding rule on returns@kenyasupport.ke that forwards copies to our returns manager at returns.manager@kenyasupport.ke. Will having two forwarding rules cause any conflict, or should I modify the existing rule rather than creating a new one?

Please let me know how to fix the spam issue and whether the dual-rule setup will work.`,

  // 3
  `Thank you, I have added mail.helpdesk.io to the email whitelist and configured the inbound gateway settings as you described.

I sent another test email and a ticket appeared in our queue this time. The spam warning is gone from the delivery logs too, so that issue is fully resolved.

On the dual routing rule — I checked the Admin Console and our existing rule is set to 'Change envelope recipient' rather than 'Also deliver to'. Based on what you said, the first matching rule wins, which means our existing rule (set up about a year ago) intercepts the mail before your ingestion rule fires.

That would explain why the first test failed. Should I change the existing rule to 'Also deliver to', or is it cleaner to consolidate both destinations into a single rule? I want the returns manager to keep receiving copies in their personal inbox.

Please advise on the best approach and I will implement it right away.`,

  // 4
  `I have gone with the consolidated approach as you recommended and edited the existing rule to include both the returns manager inbox and your ingestion address under 'Add more recipients'.

I deleted the separate Helpdesk ingestion rule I had created earlier to keep things clean.

A fresh test email confirmed that both destinations received the message — our returns manager received their copy, and a new ticket appeared in the Helpdesk queue within about 30 seconds.

To confirm my understanding: going forward, any email to returns@kenyasupport.ke will simultaneously create a ticket in Helpdesk AND deliver a copy to returns.manager@kenyasupport.ke via our Workspace rule. Is that correct?

If so, I think we are ready to proceed. Is there anything else needed to formally activate this inbox, or is it already live from this point?`,

  // 5
  `I can see ticket #107 in our queue as you mentioned. Everything looks correct.

Now that the inbox is confirmed live, I have two configuration questions.

First, is it possible to automatically assign tickets from the returns inbox to a specific team? We have a dedicated returns team of three agents and I want their tickets routed directly to them rather than sitting in the general unassigned queue.

Second, can I configure an auto-reply so customers receive immediate acknowledgement when they email returns@kenyasupport.ke? Currently there is no automated response and customers sometimes send duplicate follow-up emails because they are unsure their message arrived.

Let me know if these should be raised as separate tickets or whether we can cover both here.`,

  // 6
  `The routing rule is working perfectly. I created 'Returns Inbox Auto-assign' with the condition 'Inbox is returns@kenyasupport.ke' and two actions: assign to the returns team, and set the category to 'Returns'.

I had to create the 'Returns' category first under Settings > Categories, which was quick. A test email confirmed the ticket was assigned to the returns team with the correct category applied automatically.

Now for the auto-reply — one question before I start. Is it possible to send a different message outside our business hours? We operate Monday to Friday, 8am to 6pm East Africa Time.

Outside those hours I would prefer a message that sets the expectation of a next-business-day response, rather than a single message that applies at all times.`,

  // 7
  `I have enabled the auto-reply and customised the message using the template you provided, adapting the wording slightly to match our tone.

Before I set up the business hours filter, I have a question about timezone handling. You mentioned the schedule defaults to UTC. East Africa Time is UTC+3.

If I enter 8:00am–6:00pm in the schedule after setting the account timezone to Africa/Nairobi, will the system treat those times as EAT automatically? Or do I need to enter 5:00am–3:00pm as the UTC equivalent?

I want to get this right the first time so the auto-replies go out during the correct window.

Also, I notice Saturday and Sunday appear in the schedule with toggles that are off by default. Leaving them off means no auto-reply on those days, correct?`,

  // 8
  `I have set the account timezone to Africa/Nairobi and configured the business hours to 8:00am–6:00pm Monday through Friday with both weekend days left off.

A test email during business hours delivered the standard auto-reply correctly. I also drafted and saved an after-hours message, and the preview shows it correctly.

Here is my understanding of the full setup. Please confirm if this is accurate:

1. returns@kenyasupport.ke inbox is active and receiving tickets
2. Routing rule assigns tickets to the returns team with the Returns category
3. Business hours auto-reply: Mon–Fri 08:00–18:00 EAT
4. After-hours auto-reply for evenings and weekends
5. Account timezone: Africa/Nairobi

Is there anything else to verify before we consider this complete?`,

  // 9
  `Thank you for confirming everything. The setup feels very solid.

One more question that occurred to me: given that we are at our two-inbox limit on the Starter plan, what happens if we need to temporarily deactivate the returns inbox? For example, during our December holiday closure when the returns team is fully offline for two weeks.

Does deactivating the inbox preserve all the configuration — routing rules, auto-reply messages, business hours? And can we reactivate it afterward without reconfiguring anything?

Also, what happens to emails sent to returns@kenyasupport.ke while the inbox is deactivated? Will they still reach the returns manager via our Workspace rule, or does deactivation affect that too?

Understanding this will help me plan the holiday closure properly.`,

  // 10
  `Thank you for the thorough explanation. Knowing that configuration is preserved and the Workspace rule operates independently is very reassuring for our holiday planning.

I will make sure to update the after-hours auto-reply with holiday closure messaging before deactivating the inbox in December.

Please feel free to mark this ticket as resolved. I will reach out if anything unexpected comes up during the initial production period.

Thank you again — this has genuinely been one of the most helpful support interactions I have experienced.`,

  // 11
  `Hello again. I wanted to confirm that the production period has gone very smoothly. All tickets received via the returns inbox have been correctly routed to the returns team, and the auto-replies are working as expected.

A few customers have already commented positively on receiving the immediate acknowledgement, which was a key goal.

Since I have you — we have approximately 300 historical returns tickets from the past year stored in a spreadsheet. We were managing returns manually before setting up Helpdesk. Is there a way to import these into the system for archival purposes?

Let me know if this needs a separate ticket or if we can address it here.`,

  // 12
  `I have found the Settings > Data > Import Tickets section and can see the upload interface.

Could you share the sample CSV template? I want to format the data correctly before attempting the import. Some of our historical messages contain special characters and multi-line bodies, and I want to be sure those are handled properly.

One additional question: some of our historical tickets had associated reply threads. Is there a way to import those reply chains, or does the import only support the opening message of each ticket?

If reply threads cannot be imported, I am considering whether to concatenate the thread into the body field as a single block or import just the most recent message. Which approach would you recommend?`,

  // 13
  `The sample CSV template is very helpful, thank you. The formatting rules make sense, especially the double-quote escaping for fields containing commas.

I have started cleaning up our spreadsheet and ran a small test import of five rows using the preview feature. Three rows validated cleanly. Two rows failed — one because the received_at timestamp was in the wrong format (we had used DD/MM/YYYY rather than ISO 8601), and one because the category value had a trailing space.

After fixing those two rows the preview showed all five as valid. I am now working through the full 300-row dataset to apply the same corrections.

Can I ask — is there a way to pause and resume an import, or must the entire file be uploaded in one go? I am asking because our dataset spans multiple team members' exports and I may need to merge and clean them in stages.`,

  // 14
  `I completed the full 300-row import and it processed without errors. All tickets are now visible in the queue with the correct categories, statuses, and timestamps.

The import preview was very useful. I caught two more formatting issues in the larger dataset that I missed in the initial review — both were category slug mismatches where our internal naming used slightly different capitalisation.

One follow-up question: I notice the imported tickets are not appearing in the search results when I search by the customer's email address. New tickets from the live inbox appear in search correctly. Is there an indexing delay for imported tickets, or is this a different issue?

I have waited about 15 minutes since the import completed.`,

  // 15
  `The search is now working correctly for the imported tickets. I waited the full 30 minutes as you suggested and they appeared in results afterward.

I want to share some overall feedback. The import process was smooth and the validation preview caught issues before they caused problems in production. Our team is happy with how the setup has come together.

One last question from our team: is there a way to bulk-update the assigned agent on the imported tickets? About 60 of the 300 imported tickets belong to a former employee who left the company. I would like to reassign those 60 tickets to our current returns team lead.

Is there a bulk assignment feature, or would I need to update them one by one?`,

  // 16
  `I used the bulk selection as you described and successfully reassigned the 60 tickets to our current returns team lead. The process was quick and worked exactly as you described.

I also noticed while doing this that about 15 of the imported tickets had an incorrect status of 'open' when they should have been 'closed' — a data quality issue in our original spreadsheet. I corrected those using the same bulk update workflow and they are now showing the correct status.

Thank you for walking me through the bulk operations. This is a very useful capability that I had not noticed before.

Is there a way to export tickets from Helpdesk? I am asking because our finance team wants a monthly export of all closed returns tickets for their records.`,

  // 17
  `I found the export feature under Settings > Data > Export Tickets and ran a test export filtered to closed tickets in the returns category.

The CSV downloaded correctly and included all the fields I need. The timestamp format in the export is ISO 8601, which is the same format required for import — that consistency is very helpful.

One question: the export includes a column called ticket_id which appears to be our internal Helpdesk ID. Our finance team currently uses the Order Number mentioned in the ticket subject or body as their reference. Is there a way to add a custom field to tickets so we can store the order number as a searchable, structured attribute rather than having it buried in free text?

I realise this may be a more advanced feature.`,

  // 18
  `I have created the Order Number custom field as you described and it is now visible on the ticket detail page for all tickets in the Returns category.

I tested it by opening one of our recent returns tickets and entering the order number manually. It saved correctly and appeared in the export when I ran another test export.

For the historical imported tickets, I can see that the field is blank. Is there a way to bulk-populate the Order Number field using data from the ticket subject lines? Most of our historical ticket subjects follow the pattern 'Return request - Order #XXXX', so the order number should be extractable programmatically.

I ask because populating 300 fields manually is impractical.`,

  // 19
  `I used the API approach as you suggested. Our developer wrote a small script that reads the ticket subject, extracts the order number using a regex, and updates the custom field via the API. It ran against all 300 historical tickets and populated the Order Number field correctly in about two minutes.

This is exactly the kind of capability I was hoping for. The combination of the UI for day-to-day work and the API for batch operations is very practical.

One more question from our developer while they have the API set up: is there a webhook available for new ticket creation? We would like to push a notification to our internal Slack channel whenever a new returns ticket is created, so the team does not have to keep checking the Helpdesk queue manually.

Does the webhook support filtering by inbox or category?`,

  // 20
  `I have configured the webhook as you described. I set the endpoint to our internal Slack relay URL, enabled the ticket.created event, and added the filter for inbox = returns@kenyasupport.ke.

Our developer verified that a test event was delivered to the relay endpoint when I sent a test email. The Slack notification appeared in our returns channel within about 3 seconds of the ticket being created in Helpdesk.

The team is delighted with this. It means agents no longer need to keep the Helpdesk tab open and refreshing — they can work from Slack notifications instead.

One final question for now: the Slack notification currently shows only the ticket subject and ticket ID. Is it possible to include the customer's name, the first 200 characters of the ticket body, and a direct link to the ticket in Helpdesk? Our developer would like to know what fields are available in the webhook payload.`,

  // 21
  `Our developer has updated the Slack relay to use the additional webhook payload fields and the notifications now include the customer name, message preview, and a direct link to the ticket. The team is very happy with how this looks.

I want to take stock of everything that has been set up over the course of this support interaction:

- returns@kenyasupport.ke inbox active with Google Workspace routing
- Routing rule: auto-assign to returns team with Returns category
- Business hours and after-hours auto-replies configured
- 300 historical tickets imported and cleaned
- Bulk reassignment of 60 tickets completed
- Order Number custom field created and populated
- Webhook delivering Slack notifications for new returns tickets

This has been an extraordinarily productive support interaction. I genuinely appreciate the patience and depth of guidance you have provided throughout.

Is there anything you would recommend we look at next to further improve our returns workflow?`,

  // 22
  `Thank you for those suggestions. The SLA rules and saved replies are both things I had not considered and both sound very valuable.

I have set up two SLA rules as you described: a 4-hour first response target for open returns tickets, and a 24-hour resolution target. The dashboard now shows a countdown timer on each ticket, which gives the team a clear visual indicator of where they stand.

I also created five saved replies covering our most common returns scenarios: standard refund acknowledgement, exchange request confirmation, damaged item apology, out-of-stock notification, and escalation to warehouse. Agents are already using them and the average reply time dropped noticeably in the first hour.

One question about SLAs: if a ticket is waiting on the customer (for example, we asked them to provide a photo of the damaged item and are waiting for their reply), does the SLA clock pause or does it keep running?`,

  // 23
  `The SLA pause feature works exactly as described. I tested it by manually setting a ticket to 'Pending' status and confirmed the countdown froze. When I set it back to 'Open' the countdown resumed from where it had stopped.

This is the correct behaviour for our workflow — we should not be penalised on SLA metrics for time spent waiting on a customer response.

I have briefed the team on using 'Pending' status when they are waiting on a customer, and they are already applying it consistently.

I think we have now covered everything I originally needed and considerably more. The returns inbox is fully operational with all the supporting infrastructure in place.

Is there a way to rate this support interaction? I would like to provide formal feedback on the quality of service I received. This has been exceptional from start to finish.`,

  // 24
  `Thank you for the information on the satisfaction survey. I will complete it when it arrives.

I do have one genuinely final question. We are considering hiring a third agent specifically for returns processing. When we add them to the system, will they automatically be included in the returns team and start receiving ticket assignments, or do I need to manually add them to the team after creating their account?

I also want to confirm: the new agent will only be able to see tickets in the Helpdesk queue, not the account settings or billing information, correct? I want to ensure our settings and configuration remain controlled by the admin account.

Thank you again for everything.`,

  // 25
  `I have created the new agent account as you described and added them to the returns team. They received the invitation email, set their password, and logged in successfully.

I verified that they can see the ticket queue and the tickets assigned to the returns team, but cannot access Settings, Billing, or any admin-only areas. The access controls are working exactly as expected.

The agent also confirmed that the Slack notifications for new returns tickets are appearing for them, which means the webhook is delivering to the full team channel correctly.

I believe everything is now fully in order. This support ticket has been open for a while and has covered a remarkable amount of ground. Please mark it as resolved — and thank you once more for the outstanding support throughout.`,
];

const agent: string[] = [
  // 1
  `Thank you for reaching out to us, Moses. I have reviewed your account and can confirm that your current plan does support multiple email inboxes.

Each inbox corresponds to one email address — a single inbox cannot receive mail from multiple different addresses simultaneously. The number of active inboxes available depends on your plan tier.

On the Starter plan, which your account is currently on, you can have up to two active inboxes. The Growth plan allows five, and the Enterprise plan is unlimited.

Since you currently have one inbox active, you have one additional slot available. Adding returns@kenyasupport.ke would bring you to the Starter limit of two.

Regarding the shared queue — yes, all tickets from all inboxes appear in the same unified queue by default. However, routing rules let you filter and automatically assign tickets based on which inbox they arrived through, so your team can work in an organised way without confusion.

For ownership verification, since you are on Google Workspace you will configure a forwarding rule from the Google Admin Console rather than standard Gmail settings. I will walk you through this step by step.

Adding the new inbox has no effect whatsoever on your existing open tickets.`,

  // 2
  `Thank you for the update, Moses. The spam flagging and dual-rule situation are both common when first connecting Helpdesk to Google Workspace, and both are straightforward to resolve.

For the spam issue: Google Workspace scores forwarded messages before sending them to external addresses. To fix this, go to Admin Console > Apps > Google Workspace > Gmail > Spam, phishing and malware. Under 'Email whitelist', add the domain mail.helpdesk.io. Under 'Inbound gateway', add our IP range 203.0.113.0/24 as a trusted source. Save both settings.

For the dual-rule conflict: when two routing rules match the same recipient, Google Workspace applies them in order and the first match wins unless fallthrough is enabled. Your existing rule uses 'Change envelope recipient' and sits first in the list — it intercepts the mail before our ingestion rule can fire.

Please apply the whitelist and gateway changes first and confirm that a test email produces a ticket in your queue. Once we have a clean baseline, I will walk you through resolving the routing conflict cleanly.`,

  // 3
  `Excellent — the spam issue is confirmed resolved. Now let us fix the routing.

The cleanest solution is to consolidate both destinations into one rule. Open your existing rule in the Admin Console, click 'Edit', scroll to the recipients section, and click 'Add more recipients'. Enter our ingestion address alongside your returns manager's existing address.

Crucially, change the rule's action from 'Change envelope recipient' to 'Also deliver to'. This action makes an additional copy of the message for each recipient listed, without altering the original delivery. Your returns manager keeps receiving their copy and we receive ours.

Once you have saved, delete the separate Helpdesk ingestion rule you added — it is no longer needed and having it present could cause confusion later.

Send a fresh test email after making the change. You should see both your returns manager's inbox and the Helpdesk queue receive the message simultaneously.`,

  // 4
  `Everything is confirmed working on our end too, Moses. The consolidated rule is the right approach and it has come together cleanly.

To answer your confirmation question directly: yes, that is exactly correct. Any email to returns@kenyasupport.ke will simultaneously create a ticket in your Helpdesk queue and deliver a copy to your returns manager's personal inbox. Both actions happen in parallel, triggered by the single Workspace routing rule.

The inbox is already live — there is no separate activation step on our side. Ticket #107, which appeared during your test, confirms it is fully operational.

The inbox display name currently defaults to 'returns@kenyasupport.ke' but you can update this to something friendlier like 'Returns Inbox' under Settings > Inboxes > Configure if you prefer.

Would you like to proceed with setting up routing rules to automatically assign returns tickets to your team, and an auto-reply to acknowledge customer submissions?`,

  // 5
  `Both of those are standard configurations and we can handle them here.

For the routing rule, go to Settings > Routing Rules and click 'Create new rule'. Name it something like 'Returns Inbox Auto-assign'. Under Conditions, select 'Inbox is' and choose returns@kenyasupport.ke. Under Actions, select 'Assign to team' and choose your returns team. If the team does not exist yet, create it under Settings > Teams first.

Add a second action: 'Set category' and choose a Returns category. If it does not exist, create it under Settings > Categories beforehand.

Save the rule and send a test email to verify. The resulting ticket should appear assigned to the returns team with the correct category applied automatically.

Once you have confirmed the routing rule, let me know and we will move on to the auto-reply configuration.`,

  // 6
  `The routing rule is confirmed working. Now for the auto-reply.

Go to Settings > Inboxes, find returns@kenyasupport.ke, and click Configure. Scroll to the Auto-reply section and toggle it on.

You can use these placeholders in the message body: {{customer_name}} for the sender's name, {{ticket_id}} for the ticket number, and {{inbox_name}} for the inbox display name.

Here is a starting template: "Hi {{customer_name}}, thank you for contacting Kenya Support. Your request has been logged as ticket #{{ticket_id}}. Our returns team will respond within 1 business day. Kind regards, The Kenya Support Returns Team."

Save and send a test email to confirm the auto-reply arrives. After that I will walk you through the business hours configuration so you can send different messages during and outside your operating hours.`,

  // 7
  `Great question about the timezone, Moses — this is important to get right.

Once you set the account timezone to Africa/Nairobi under Settings > Account > Timezone, all time-based features including the business hours schedule will interpret times in that timezone automatically. You do not need to enter UTC equivalents manually.

So entering 8:00am–6:00pm in the schedule after setting the timezone to Africa/Nairobi will correctly mean 08:00–18:00 EAT. Internally the system stores times as UTC, but all configuration and display uses your account timezone.

Regarding Saturday and Sunday: correct — leaving those day toggles off means no auto-reply fires on those days. Emails received on those days will receive the after-hours message if you configure one, or no automated reply at all if the after-hours option is left disabled.

I strongly recommend setting up an after-hours message. It prevents customers from wondering whether their message arrived when they email outside business hours.`,

  // 8
  `Your summary is completely accurate on all five points. The setup is confirmed complete.

A small note on timezones that may be useful: Kenya does not observe daylight saving time, so Africa/Nairobi is always UTC+3 year-round. You will never need to adjust your business hours schedule for seasonal clock changes.

I will leave this ticket open for 48 hours as a buffer in case anything unexpected surfaces during initial production use. After that it will move to Resolved status automatically, but you can reopen it at any time by replying to any notification email associated with this ticket.

If you upgrade to the Growth plan in future, all existing configuration carries over automatically and the additional inbox slots become available immediately.

Is there anything else before I sign off?`,

  // 9
  `Good news on both counts, Moses.

Deactivating an inbox preserves all associated configuration completely — routing rules, auto-reply messages, business hours schedule, and all other settings. When you reactivate, everything resumes working immediately with no reconfiguration required.

Deactivating does free up the inbox slot on your plan. If you deactivated the returns inbox you would have one free slot available for a different inbox. Reactivating the returns inbox later would occupy the slot again.

Regarding emails during the deactivation period: the Helpdesk inbox stops listening for new messages, so no tickets will be created from emails sent to that address. However, your Google Workspace routing rule operates entirely independently. Emails to returns@kenyasupport.ke will still be forwarded to your returns manager via Workspace — deactivating the Helpdesk inbox has no effect on your Workspace configuration.

I recommend updating the after-hours auto-reply with holiday closure messaging before deactivating, so customers who receive no acknowledgement via Helpdesk understand why.`,

  // 10
  `Thank you for the kind words, Moses — it has been a pleasure working through this with you.

I will go ahead and mark this ticket as resolved now. The 48-hour window has elapsed and the production period has clearly been successful.

If you decide to explore the Growth plan in future, the transition is seamless. All inboxes, routing rules, saved replies, and settings carry over automatically, and the additional inbox capacity becomes available immediately upon upgrade.

Have a great rest of your day and do not hesitate to reach out if anything comes up.

Best regards,
Agent
helpdesk.io`,

  // 11
  `Hello again, Moses — good to hear from you and great to know the production period has gone so smoothly. The usage data on our end confirms it too: 12 tickets ingested correctly, routing applied on all 12, and 12 auto-replies delivered successfully.

Regarding the historical import — yes, absolutely supported. The CSV import feature lives under Settings > Data > Import Tickets.

The required CSV columns are: subject, body, from_email, from_name, received_at, status, and category. Timestamps go in ISO 8601 format (e.g. 2026-01-15T09:30:00Z) and status accepts 'open', 'pending', or 'closed'.

For 300 records a single file will work fine — the tool handles up to 1,000 rows per file. Imported tickets do not trigger routing rules or auto-replies, which is the correct behaviour for historical data.

I will share a sample CSV template in my next message. In the meantime you can start reviewing your spreadsheet for any data quality issues that might need cleaning before the import.

No need for a separate ticket — we can handle this here.`,

  // 12
  `Here is a sample CSV template with two example rows:

subject,body,from_email,from_name,received_at,status,category
"Return request - Order #1042","Hi, I would like to return the jacket I ordered last week. It does not fit.",customer1@email.com,Jane Doe,2025-11-01T10:00:00Z,closed,returns
"Damaged item - Order #1087","Hello, my order arrived damaged. Please advise.",customer2@email.com,John Mwangi,2025-11-03T14:22:00Z,closed,returns

Key formatting rules: any field containing a comma must be wrapped in double quotes; double quotes within a field must be escaped by doubling them.

For multi-line bodies, wrap the entire body in double quotes and include the line breaks directly within the quoted string. Most spreadsheet CSV exports handle this automatically.

Regarding reply threads: the CSV import supports only the opening message of each ticket. For historical threads I would recommend concatenating the key exchanges into the body field as a single formatted block — it preserves context and is practical for 300 records. If you have developer resources available, our API supports creating reply records programmatically after the initial import, which produces a proper threaded view.

You can pause and resume between files — the import processes each file independently, so you can split your 300 rows across multiple sessions if needed.`,

  // 13
  `Glad the template is helping, Moses. The issues you encountered in the preview — wrong timestamp format and trailing space in a category value — are the two most common data quality problems we see in spreadsheet exports. You caught them early.

Imports do not need to be completed in a single session. Each file upload is independent, so you can clean and upload your data in batches. The tool processes each file sequentially and there is no risk of duplication as long as you are uploading distinct rows each time.

One tip for the timestamp column: if your spreadsheet software is converting the ISO 8601 dates back to its own date format on re-open, set the column type to 'Text' before editing to prevent automatic reformatting.

Let me know once you have run the full 300-row import and I can confirm on our end that all records landed correctly.`,

  // 14
  `The import completed successfully on our end too — I can see 300 new records with the correct timestamps and categories in your account.

Regarding the search indexing: imported tickets go through a brief indexing process that typically completes within 5–10 minutes but can take up to 30 minutes during high system load. The tickets are fully accessible and editable immediately after import; it is only the full-text search index that takes a little time to catch up.

Please wait a further 15 minutes and search again. If the imported tickets are still not appearing in search results after 30 minutes total, please let me know and I will escalate to our infrastructure team.`,

  // 15
  `I can confirm the search index has caught up — the timestamps in our logs show the indexing completed about 28 minutes after your import, which is within the normal window.

For bulk reassignment: in the ticket queue, use the checkboxes on the left of each ticket row to select multiple tickets. You can filter by category and status first to narrow the list, then use 'Select all on this page' to capture the full set matching your filters. The reassign action appears in the bulk action bar at the top of the table.

If you need to select more than one page of tickets, apply your filters first to isolate just the tickets belonging to the former employee (you can filter by assigned agent), then select all and reassign.

The former agent's account does not need to be deleted or deactivated for this to work — you can reassign from an active or inactive account.`,

  // 16
  `Excellent work, Moses — the bulk reassignment and status corrections are confirmed in our system.

Regarding ticket exports: go to Settings > Data > Export Tickets. You can filter the export by date range, status, category, inbox, and assigned agent. For your finance team's monthly use case, I would recommend filtering by status = closed, category = returns, and setting a date range for the previous calendar month.

The export downloads as a CSV file containing all ticket fields including the ticket ID, subject, body, from details, category, status, timestamps, and assigned agent name.

If your finance team needs a consistent, predictable format each month, you might consider asking them to bookmark the export page with the appropriate filters pre-applied. The filter state is reflected in the URL, so a bookmarked link will pre-populate the filters on each visit.`,

  // 17
  `Custom fields are available on your plan, Moses. Go to Settings > Custom Fields and click 'Add field'. Set the name to 'Order Number', the type to 'Text', and scope it to the 'Returns' category so it only appears on tickets in that category.

Once created, the field will appear on the ticket detail page for all Returns tickets and will be included as an additional column in your CSV exports.

For populating the field on your 300 historical tickets programmatically, you can use our API. The endpoint is PATCH /api/tickets/{id} with a custom_fields object in the request body: {"custom_fields": {"order_number": "1042"}}. Your developer can write a script that reads the ticket subject, extracts the order number using a regex, and calls the API for each ticket.

If you would like the API authentication documentation, I can share it in my next message.`,

  // 18
  `That is a great result — extracting order numbers from 300 subject lines and populating the custom field via API in two minutes is exactly the kind of task the API is designed for.

Webhooks are available under Settings > Integrations > Webhooks. Click 'Add webhook', enter your endpoint URL, and select the events to subscribe to. For new ticket notifications, select the ticket.created event.

Webhook payloads include the full ticket object by default, which contains the ticket ID, subject, body, from_name, from_email, category, status, inbox name, assigned agent, and all custom field values.

For filtering by inbox: add the filter condition 'inbox = returns@kenyasupport.ke' on the webhook configuration page. This ensures the webhook only fires for tickets created via the returns inbox, so your Slack channel does not receive notifications for your primary inbox tickets.`,

  // 19
  `Glad to hear the webhook is delivering correctly and the team is finding the Slack notifications useful.

The full list of fields available in the ticket.created webhook payload is: ticket_id, subject, body (plain text), body_html (HTML version), from_email, from_name, category, status, inbox_name, inbox_email, assigned_to (agent name or null), created_at, and custom_fields (an object containing all custom field values keyed by field slug).

There is also a ticket_url field that contains the direct link to the ticket in your Helpdesk dashboard — this is the most useful field for Slack notifications as agents can click directly from the notification to the ticket without needing to search.

If you want to include the first 200 characters of the body in the notification, your developer can simply truncate the body field from the payload client-side — no special API parameter is needed.`,

  // 20
  `It sounds like the Slack integration is working beautifully. Webhook customisation on the client side gives you full control over the notification format, and the ticket_url field makes the notifications immediately actionable.

Since you have now completed the core setup and are thinking about what comes next, a few areas worth considering for your returns workflow:

SLA rules let you set response time targets per category or inbox. Under Settings > SLAs you can define a first-response target (e.g. 4 hours) and a resolution target (e.g. 24 hours). Tickets approaching or breaching the target show a visual indicator in the queue, which helps the team prioritise.

Saved replies under Settings > Saved Replies let you store templated responses for your most common returns scenarios. Agents can insert them with a single click from the reply compose area, reducing typing time and ensuring consistent messaging.

Both features are available on your current plan. Would you like guidance on setting either of these up?`,

  // 21
  `Thank you for sharing that summary, Moses — it is a pleasure to see a setup of this scope come together in a single support interaction.

To directly answer your question about what to look at next: in addition to the SLA rules and saved replies I mentioned, I would suggest looking at Reporting under Settings > Reports. The Returns category now has enough ticket volume that the category-level reports will start showing useful trends — average first response time, resolution time, ticket volume by day of week, and top customer domains.

This data can help you identify whether your three-agent returns team is appropriately sized for the volume, and whether certain days of the week need more coverage.

I would also recommend scheduling a periodic review of your routing rules and SLA targets once you have four to six weeks of data. The initial targets are often set conservatively and adjusted once the team has a realistic picture of throughput.

Is there anything specific about the reporting features you would like me to walk you through?`,

  // 22
  `Excellent — SLA rules and saved replies are both high-value additions at this stage of your setup.

For SLA rules: go to Settings > SLAs and click 'Create rule'. Set the scope to 'Category is Returns'. Set the first response target to 4 hours and the resolution target to 24 hours. Under escalation, you can configure an email notification to the team lead if a ticket is within 1 hour of breaching the first response target.

Once saved, a countdown timer appears on each Returns ticket in the queue. Tickets within one hour of breaching show an amber indicator; tickets that have breached show red.

Regarding SLA pausing when waiting on customers: yes, this is supported. When an agent sets a ticket status to 'Pending', the SLA clock pauses automatically. It resumes when the ticket returns to 'Open' status — either manually by an agent or automatically when the customer replies.

This is the correct way to handle cases where you are waiting on a photo or additional information from a customer.`,

  // 23
  `The SLA pause is working correctly — that is the expected behaviour.

For saved replies: go to Settings > Saved Replies and click 'Add reply'. Each saved reply has a title (internal reference only), a subject line override (optional), and a body. You can use the same {{customer_name}} and {{ticket_id}} placeholders available in the auto-reply.

I would suggest starting with five core templates: standard refund acknowledgement, exchange request confirmation, damaged item apology and photo request, out-of-stock notification with estimated restock date, and escalation to warehouse message.

To use a saved reply when composing, agents click the saved replies icon in the compose toolbar, search by title, and click to insert. They can then personalise before sending.

On satisfaction surveys: your current plan includes a post-resolution CSAT survey. It sends automatically when a ticket is marked Resolved. The survey email goes to the original customer with a simple one-click rating. Results appear in the Reports section under Customer Satisfaction.`,

  // 24
  `Adding a new agent is straightforward. Go to Settings > Team Members and click 'Invite agent'. Enter their email address and select 'Agent' as the role. They will receive an invitation email and can set their password from there.

Once they have accepted the invitation, go to Settings > Teams, open the returns team, and add the new agent as a member. From that point, the routing rule will include them in the assignment pool automatically.

Regarding permissions: Agent role users can access the ticket queue, create and respond to tickets, view reports, and use all queue features. They cannot access Settings (except their own profile), Billing, Integrations, or any account-level configuration. Admin role is required for all of those.

So yes, your settings, routing rules, API keys, and billing information remain fully controlled by the admin account.`,

  // 25
  `That is great to hear, Moses. The new agent is confirmed active in our system and their team membership is showing correctly.

To summarise everything that has been configured over the course of this support interaction:

- returns@kenyasupport.ke inbox active with Google Workspace routing rule
- Routing rule: auto-assign to returns team, category = Returns
- Business hours auto-reply (Mon–Fri 08:00–18:00 EAT) and after-hours auto-reply
- Account timezone: Africa/Nairobi
- 300 historical tickets imported, cleaned, and fully indexed
- 60 tickets bulk-reassigned; 15 status corrections applied
- Order Number custom field created and populated via API for all 300 historical tickets
- Webhook delivering Slack notifications for new returns tickets with direct links
- SLA rules: 4-hour first response, 24-hour resolution with escalation alerts
- Five saved replies for common returns scenarios
- Third agent onboarded and added to the returns team

I will mark this ticket as resolved now. It has been a genuine pleasure working with you, Moses. Your methodical approach made the entire process smooth and efficient.

Best regards,
Agent
helpdesk.io`,
];

async function main() {
  const startMs = new Date('2026-05-03T16:35:00.000Z').getTime();
  let t = startMs;

  for (let i = 0; i < 25; i++) {
    await prisma.reply.create({
      data: {
        ticketId: TICKET_ID,
        authorId: AUTHOR_ID,
        body: customer[i],
        senderType: 'customer',
        createdAt: new Date(t),
        updatedAt: new Date(t),
      },
    });
    t += 23 * 60 * 1000;

    await prisma.reply.create({
      data: {
        ticketId: TICKET_ID,
        authorId: AUTHOR_ID,
        body: agent[i],
        senderType: 'agent',
        createdAt: new Date(t),
        updatedAt: new Date(t),
      },
    });
    t += 37 * 60 * 1000;
  }

  console.log(`Created ${25 * 2} replies for ticket ${TICKET_ID}.`);
  await prisma.$disconnect();
}

main();
