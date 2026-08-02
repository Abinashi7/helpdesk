## AI Ticket Management System

## Problem
We receive a large volume of support request emails from consumers. Agents manually read and reply to each one, which is time-consuming and doesn't scale.

## Solution
AI monitors a Gmail inbox, converts emails into tickets, and auto-replies to menial/common questions by referencing a knowledge base. Complex issues are flagged and routed to human agents for review.

## Email Intake
- Mailgun (end-to-end: inbound routes + outbound sending)
- Support address MX records point to the provider; incoming emails are POSTed to an Express webhook
- ~100 emails/day expected volume
- Incoming replies to existing threads reopen/update the same ticket (conversation threading)

## Auto-reply Logic
```
Email arrives
  → AI checks knowledge base + classifies query
  → Menial / already answered in KB → auto-reply immediately
  → Complex / AI unsure → create ticket, flag for agent review
```

## Prioritization
- High-priority tickets are surfaced immediately for agents
- Priority is AI-determined based on email content (urgency signals, topic severity)
- Agents notified in-app when high-priority tickets arrive (notification strategy TBD)

## Knowledge Base
- Used by AI to look up answers before replying
- TBD: whether it starts pre-populated or is built over time from resolved tickets
- TBD: whether admins can manually add/edit KB articles

## Ticket Features
- Summarize the email content
- Tag-based categorization (flexible, AI-assigned)
- Priority levels (AI-determined)
- Conversation threading (replies update existing ticket)
- Track whether response was AI-sent vs. human-modified (for analytics)

## Agent Workflow
- Flagged tickets land in a shared queue (agents pick them up)
- Agents can edit or override AI-drafted responses before sending
- Agents can reassign tickets to each other (TBD)
- TBD: escalation rules if no agent responds within X time

## Roles & Access
- **Admin**: Full dashboard access, creates/manages agent accounts, manages KB
- **Agent**: Logs in to work ticket queue, can edit/send responses, can override AI

## Dashboard (Admin)
- View all tickets (open, resolved, flagged)
- Filter by tag, priority, status, assigned agent
- Ticket volume and response time metrics
- Agent activity overview

## Open Questions
- Does the KB start pre-populated, or grow from resolved tickets automatically?
- What exactly defines "high priority" — is there a fixed taxonomy or fully AI-determined?
- Escalation: what happens if a flagged ticket sits unanswered for too long?
- Should customers ever know they're talking to AI vs. a human agent?
- Notification channels for agents: in-app only, or also email/SMS for high-priority?
