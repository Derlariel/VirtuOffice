==================================================
PHASE 6 — ACTIVITY / INACTIVITY SYSTEM
======================================
 
PROMPT:
 
Implement a privacy-preserving activity detection system.
 
Track only browser/device interaction signals such as:
 
* pointer interaction
* keyboard interaction
* touch
* window focus
* document visibility
Do NOT record:
 
* keystroke contents
* mouse coordinates continuously for surveillance
* screenshots
* webcam feeds
Behavior:
 
If there is no relevant activity for 5 minutes:
 
1. Show a visible warning:
   "Are you still working?"
2. Allow the user to confirm activity.
3. If the user does not respond during the configured grace period:
   * mark status INACTIVE
   * create an inactivity event
   * notify their supervisor (using the reporting relationship from Phase 2).
Important architecture requirement:
 
The 5-minute threshold and escalation grace period must be configurable.
 
Use timestamps instead of running heavy timers every second.
 
Pause or correctly handle timers when the tab is sleeping.
 
Do not interpret inactivity as evidence that the employee is not actually working.
 
Apply the retention/expiry rule for ActivityEvent defined in the Compliance section.