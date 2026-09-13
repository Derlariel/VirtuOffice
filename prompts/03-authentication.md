==================================================
PHASE 3 — AUTHENTICATION
========================
 
PROMPT:
 
Implement authentication.
 
Allow login only when the email belongs to an allowed domain stored in the backend/database.
 
Initial allowed domains:
 
mail.kmutt.ac.th
kmutt.ac.th
ad.sit.kmutt.ac.th
 
Requirements:
 
* server-side validation
* secure sessions
* protected routes
* role support
* unauthorized page
* domain configuration that can be modified later
* no hardcoded authorization logic scattered across components
Create middleware/guards where appropriate.
 
Never rely only on frontend email validation.