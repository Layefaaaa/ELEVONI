# ELEVONI — AI CODING AGENT INSTRUCTIONS

## 1. ROLE OF THIS FILE

This file defines the rules for AI coding agents working on the Elevoni repository.

The agent is an implementation and engineering assistant.

The agent is NOT:

* the product owner
* the business owner
* the founder
* the final architecture decision-maker
* authorized to invent business facts
* authorized to invent customers, suppliers, traction, revenue, partnerships, or AI capabilities

When a requirement is ambiguous and the ambiguity affects business behavior, architecture, security, data integrity, or scope, STOP and ask for clarification.

Do not make silent assumptions.

---

# 2. WHAT ELEVONI IS

Elevoni Farms is a real agricultural business and brand owned by the user's sister.

The current digital product is being built around the real Elevoni business.

Elevoni should NOT be described or treated as merely an online fish store.

The broader vision is:

**agricultural commerce + structured transaction data + analytics + intelligence + smarter agriculture**

However, the current business must always be distinguished from the long-term vision.

## Current reality

* Elevoni is a real agricultural business; the existing smoked-catfish operation remains part of the product.
* Elevoni is transitioning from a sole-vendor smoked-catfish storefront toward a multi-vendor agricultural marketplace.
* The marketplace and vendor portal are part of the current COUCH product direction.
* The existing catfish catalogue and commerce flow remain part of Elevoni.
* Real customers, orders, payments, and deliveries exist for the existing smoked-catfish business.
* The website is a real commerce system for that existing operation.
* The marketplace is under active development and is not yet a complete transaction system.
* Marketplace capabilities must not be described as implemented unless they exist in the code, are integrated, and have been tested.
* Do not invent active vendors, vendor orders, sales, reviews, stock, or delivery capabilities.
* Nationwide marketplace participation does not automatically establish nationwide delivery coverage.
* Marketplace checkout and fulfilment must not be assumed to work until verified.
* AI capabilities must not be claimed as implemented unless they actually exist in the code and have been tested.

Never create fake vendors, fake farms, fake customers, fake orders, fake revenue, or fake AI results to make a demo look better.

---

# 3. COUCH COMPETITION CONTEXT

Elevoni is being developed for the Coderina University Challenge (COUCH).

The COUCH Grand Finale is scheduled for November 17, 2026.

The product and pitch must both be taken seriously.

The central product story is:

**Real agricultural commerce**
→ **real transactions**
→ **structured data**
→ **analytics**
→ **intelligence**
→ **better agricultural decisions**

The strongest existing evidence is the working commerce operation and real-world traction.

Do not allow ambitious future features to undermine the credibility of what already works.

---

# 4. DEVELOPMENT PHILOSOPHY

The core principle is:

> Business should not outrun reality.

Prioritize:

1. Real customers
2. Real products
3. Real orders
4. Correct pricing
5. Reliable payments
6. Reliable fulfilment
7. Accurate transaction records
8. Useful analytics
9. Useful intelligence
10. AI

Do not build impressive-looking technology that does not solve a real business problem.

Do not add complexity merely because a technology is available.

Prefer:

**simple at the edges, sophisticated underneath.**

---

# 5. CURRENT TECHNOLOGY STACK

Primary stack:

* MongoDB
* Express
* React
* Node.js
* Vite
* JavaScript
* Git/GitHub
* Vercel
* Paystack
* Cloudinary

There are currently separate applications for:

* customer frontend
* admin frontend
* vendor portal
* backend API

Do not migrate the stack without explicit approval.

Do not introduce another framework or major infrastructure system without a clear requirement.

---

# 6. APPLICATION ARCHITECTURE

## Customer frontend

Responsible for:

* displaying products
* collecting user input
* cart interaction
* checkout interaction
* payment initiation
* order history
* customer-facing UX

The frontend is NOT authoritative for:

* prices
* totals
* payment status
* authorization
* order ownership
* fulfilment state

Never trust browser-supplied financial values.

---

## Backend

Responsible for:

* business rules
* authentication
* authorization
* product validation
* price calculation
* order creation
* payment verification
* order state
* data integrity
* analytics
* intelligence services

Business-critical calculations must happen on the backend.

---

## MongoDB

MongoDB is the system's transaction memory.

It stores structured records such as:

* users
* products
* orders
* payment information
* customer history
* product information
* future analytics data

Do not destroy historical information merely to simplify current UI behavior.

---

## Admin application

The admin application is for business operations.

It should allow authorized staff to manage things such as:

* products
* pricing
* orders
* customers
* fulfilment
* business information
* analytics

Admin APIs must be protected server-side.

Never rely on hiding an admin UI element as authorization.

---

# 7. SECURITY RULES

Security is a backend responsibility.

Always enforce:

* authentication
* authorization
* ownership
* role checks
* server-side validation

Never trust:

* userId supplied by the browser
* price supplied by the browser
* amount supplied by the browser
* payment status supplied by the browser
* admin role supplied by the browser
* order ownership supplied by the browser

Use authenticated identity from the server-side auth context.

Existing authentication uses JWT/Bearer authentication.

Do not silently replace the authentication system.

---

# 8. ORDER ARCHITECTURE

An order represents a real commercial transaction.

Important order concepts include:

* customer
* products
* quantities
* unit prices
* line totals
* subtotal
* delivery fee
* total amount
* delivery address
* payment method
* payment status
* payment reference
* fulfilment/order status
* timestamps

Order items should preserve price snapshots.

Historical orders must not change simply because a product's current price changes.

Example:

If a customer buys a product for ₦25,000 today and the product becomes ₦28,000 tomorrow, the historical order must still show ₦25,000.

---

# 9. PAYMENT VS FULFILMENT

Payment state and fulfilment state are different concepts.

Do NOT collapse them into one boolean.

Payment may be:

* pending
* successful
* failed
* unpaid

Fulfilment may be:

* pending confirmation
* confirmed
* processing
* out_for_delivery
* delivered
* cancelled

An unpaid online order must not silently become a fulfilled order.

Never allow the browser to mark an order as paid.

Payment verification must be performed server-side.

---

# 10. PRICING

Pricing is business-critical.

The backend is authoritative.

Do not trust frontend pricing.

Current smoked-catfish wholesale pricing historically uses quantity tiers:

* 1–4 kg: ₦25,000/kg
* 5–9 kg: ₦24,000/kg
* 10–19 kg: ₦22,500/kg
* 20+ kg: ₦21,000/kg

These values are historical business data and must not be changed without approval.

Prices may change in the real business.

Do not hard-code business pricing in multiple unrelated locations when a proper centralized product-pricing architecture can be used.

The preferred direction is:

**Product → pricing configuration → backend pricing calculation → order price snapshot**

Pricing tiers must:

* have valid minimum quantities
* have valid maximum quantities where applicable
* not overlap
* not contain gaps
* have at most one open-ended final tier
* have valid non-negative prices

Do not use product names as the primary mechanism for determining pricing rules when a structured product pricing configuration can represent the rule.

---

# 11. PRODUCT MODEL

Products should contain structured information.

Typical product information includes:

* name
* description
* price
* category
* image
* media
* pricing configuration

Avoid putting business logic directly inside the MongoDB model when that logic belongs in a service.

Prefer:

**model = data structure and data validation**

**service = business logic**

For example, product pricing logic should preferably live in a pricing service rather than making the database model decide business rules based on product names.

---

# 12. CURRENT PRODUCT SCOPE

The current product includes:

* Elevoni's existing smoked-catfish commerce.
* The multi-vendor agricultural marketplace and vendor portal, which are part of the current COUCH product direction.

The marketplace is under active development. Do not describe it as fully implemented, and do not assume marketplace checkout or fulfilment works until verified.

Do NOT create vendor commissions, vendor wallets, vendor payouts, or marketplace seller accounts beyond the existing vendor application and listing workflow unless explicitly approved.

Do not expand vendor onboarding or dashboards beyond the existing workflow without explicit approval.

Do not invent active vendors, orders, sales, reviews, stock, or delivery capabilities.

---

# 13. DATA FOUNDATION

The long-term intelligence system depends on good transaction records.

Where appropriate, transaction data should capture:

* customer
* product
* quantity
* price
* total
* date
* time
* delivery information
* location
* payment status
* fulfilment status
* order source

Do not fabricate missing historical data.

If synthetic data is needed for development or demonstration:

* clearly label it synthetic
* keep it separate from real production data
* never present synthetic results as real business performance

If external datasets are used:

* identify them as external
* do not represent them as Elevoni data

---

# 14. ANALYTICS

Analytics should answer real business questions.

Examples:

* How many orders are we receiving?
* What is revenue over time?
* Which products sell most?
* What quantities are customers buying?
* Are customers returning?
* Which locations generate demand?
* What periods show higher demand?
* What products are slow-moving?

Do not create vanity dashboards merely because charts look impressive.

Every major metric should have a business reason.

---

# 15. AI AND INTELLIGENCE

AI must not be presented as magic.

The intended progression is:

**transactions**
→ **data**
→ **analytics**
→ **patterns**
→ **intelligence**
→ **AI-assisted decisions**

Possible future capabilities include:

* demand forecasting
* price intelligence
* supply/stock intelligence
* anomaly detection
* recommendations
* AI business advisor

Only implement these when there is enough data, a defined business question, and a technically defensible approach.

Do not claim an AI model exists if it does not.

Do not generate fake forecasts from random numbers.

Do not hide synthetic data behind the label "AI prediction."

Every intelligence feature must state what data it uses.

---

# 16. AI-READY VS AI-IMPLEMENTED

These are different.

### AI-ready

Means:

* structured data exists
* APIs exist
* transaction records exist
* the system can support future intelligence

### AI-implemented

Means:

* a real model/service exists
* it receives actual defined inputs
* it produces outputs
* the outputs are tested
* the feature is actually integrated into the application

Do not confuse these states.

---

# 17. UI/UX PRINCIPLES

Elevoni's visual direction:

* white background
* black text
* restrained grayscale/gray controls
* thin dividers
* generous whitespace
* premium agricultural feel
* strong photography
* simple layouts
* clear typography

Do not turn the interface into:

* a Jumia-style marketplace
* a cluttered dashboard
* a generic AI SaaS interface
* cyberpunk UI
* excessive gradients
* excessive badges
* tiny text
* endless filters

The guiding principle:

**Simple at the edges. Sophisticated underneath.**

Customer journey should remain simple:

**Discover → Compare → Buy → Receive**

---

# 18. MOBILE

A future mobile application may reuse the same backend and database.

Preferred architecture:

**Web + Mobile**
→ **same backend**
→ **same database**
→ **same business rules**

Do not create a second backend containing duplicated business logic.

When mobile work begins, the priority is the core customer journey:

* Browse
* Product
* Cart
* Checkout
* Payment
* Orders
* Tracking

Do not build unnecessary mobile features before the core experience works.

---

# 19. API RULES

APIs must:

* validate input
* authenticate where required
* authorize users
* enforce ownership
* return predictable responses
* handle errors
* avoid exposing secrets
* avoid trusting financial values from the client

Never expose:

* payment secrets
* JWT secrets
* database credentials
* Cloudinary secrets
* private environment variables

Never commit `.env` files containing secrets.

---

# 20. DATABASE RULES

Protect historical business data.

Before changing schemas:

1. understand existing documents
2. understand existing consumers
3. consider migration requirements
4. preserve backwards compatibility where appropriate

Do not delete fields simply because the current frontend does not use them.

Do not perform destructive migrations without explicit approval.

---

# 21. DEPENDENCY RULES

Do not add a dependency simply because it makes a small task easier.

Before adding a dependency ask:

* Is it necessary?
* Does the project already solve this?
* Does it significantly increase maintenance?
* Does it introduce security or deployment risk?

Prefer existing dependencies and standard platform capabilities.

---

# 22. GIT SAFETY

Git is the safety system.

Before making significant changes:

* inspect git status
* inspect relevant diffs
* understand existing uncommitted changes

NEVER:

* run `git reset --hard`
* discard uncommitted work
* overwrite unrelated changes
* force push
* rewrite history

unless explicitly instructed by the user.

Do not commit automatically unless explicitly requested.

Keep changes focused.

---

# 23. UNFINISHED WORK

At the beginning of a task, inspect existing uncommitted changes.

There may be unfinished work from previous coding agents.

Do NOT assume unfinished code is disposable.

Do NOT revert it automatically.

Determine:

1. what changed
2. why it changed
3. what is correct
4. what is incomplete
5. what is wrong
6. what should be retained

Then report the findings before making destructive changes.

---

# 24. FEATURE WORKFLOW

For every feature:

### Phase 1 — Understand

Read the relevant code.

### Phase 2 — Plan

Identify:

* affected files
* backend changes
* frontend changes
* database changes
* security implications
* tests

### Phase 3 — Implement

Make the smallest coherent change.

### Phase 4 — Validate

Run:

* relevant tests
* build
* lint where appropriate
* API checks where possible

### Phase 5 — Review

Inspect:

```bash
git diff
```

Look for:

* accidental changes
* security problems
* duplicated logic
* unnecessary complexity
* regressions

### Phase 6 — Report

Tell the user:

* what changed
* files changed
* tests run
* what passed
* what failed
* remaining risks

Do not claim something works if it was not tested.

---

# 25. CURRENT DEVELOPMENT PRIORITY

The current priority is NOT to build the entire future vision immediately.

The immediate priority is:

## Product Foundation

1. Product model
2. Product pricing
3. Admin product creation
4. Admin product editing
5. Product display
6. Backend pricing
7. Cart pricing
8. Checkout pricing
9. Order price snapshots

Then:

## Data Foundation

Then:

## Analytics

Then:

## Intelligence

Then:

## AI Advisor

Then:

## Demo and pitch polish

---

# 26. CURRENT UNFINISHED PRODUCT/PRICING WORK

There are currently uncommitted changes related to Product & Pricing Management.

Relevant areas include:

* backend/models/fishModel.js
* backend/controllers/fishController.js
* backend/controllers/orderPricing.js
* backend/routes/fishRoute.js
* backend/services/productPricing.js
* backend/migrations/
* backend/tests/product-pricing.test.js
* admin product creation
* admin product editing
* admin product list
* frontend pricing utilities
* product display
* item details
* store context

These changes were started by a previous coding agent.

Do NOT assume they are correct.

Before modifying them:

* inspect the diff
* inspect the new files
* understand the architecture
* identify incomplete work
* identify regressions
* propose the smallest correct completion plan

---

# 27. NO BUSINESS INVENTION

Never invent:

* customers
* orders
* revenue
* profit
* suppliers
* farms
* partnerships
* vendors
* market share
* AI accuracy
* forecasts
* customer counts
* delivery counts
* geographic demand
* production capacity

If information is unavailable, say:

**"Data not available."**

Do not fill the gap with plausible numbers.

---

# 28. NO FEATURE CREEP

Do not implement features simply because they might be useful someday.

If the requested feature can be solved without:

* a new service
* a new database collection
* a new dependency
* a new framework
* a new architecture

prefer the simpler solution.

Future vision is not permission to build future infrastructure prematurely.

---

# 29. WHEN TO STOP AND ASK

Stop and ask for clarification when:

* a business rule is unclear
* a pricing rule is unclear
* payment behavior is unclear
* fulfilment behavior is unclear
* a database migration could destroy data
* a security decision is required
* a feature conflicts with current business reality
* a requested feature would significantly change architecture
* the task requires inventing unavailable data
* the requested implementation conflicts with these instructions

Do not guess silently.

---

# 30. DEFINITION OF DONE

A feature is not done merely because the code compiles.

A feature is done when:

* the implementation matches the requirement
* business rules are correct
* security is enforced
* data integrity is preserved
* relevant tests pass
* builds pass
* no obvious regression exists
* the diff is focused
* the behavior is understandable
* remaining limitations are documented

---

# 31. AGENT COMMUNICATION

Before implementation of a non-trivial task, briefly state:

### Understanding

What you believe the task is.

### Plan

What you intend to change.

### Risk

Anything that could affect existing behavior.

After implementation, report:

### Changed

What was modified.

### Tested

What was actually tested.

### Result

What passed or failed.

### Remaining

Any known limitations.

Keep reports concise.

---

# 32. FINAL PRINCIPLE

The goal is not to make Elevoni look like a trillion-dollar company.

The goal is to build the foundation that could eventually support one.

**Real business first.**

**Real data second.**

**Useful intelligence third.**

**AI where it creates genuine value.**

Never sacrifice truth for the appearance of sophistication.

Build the damn thing.

Make it real.

Make it defensible.

Win the couch.
