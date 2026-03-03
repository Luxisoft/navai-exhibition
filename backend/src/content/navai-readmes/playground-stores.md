# Ecommerce Stores Demo (SQLite + localStorage)

This page demonstrates how NAVAI can operate in a realistic ecommerce environment without exposing or modifying real production data.

## Safety model

- The seed catalog, customers, and orders come from a **read-only SQLite demo database**.
- Users can query the seed data and generate reports through NAVAI tools.
- Users cannot edit or delete seed products.

## User-generated data

- Products created by visitors are stored in **localStorage** only.
- Edits, deletes, and purchase simulations for user products also remain in localStorage.
- This keeps the public demo safe and avoids polluting the shared seed database.

## What to test with NAVAI

- Ask for sales or catalog reports based on the SQLite seed data.
- Ask NAVAI to list products, recent orders, or category performance.
- Ask NAVAI to create, update, delete, or buy products on this page (local demo actions).
- Ask NAVAI to navigate and scroll to specific sections like forms or reports.

## Demo sections

- KPI dashboard and category sales report
- Combined catalog (seed + user products)
- CRUD form for user products
- Purchase simulator
- Seed recent orders table

