==================================================
PHASE 0 — PROJECT ANALYSIS
==========================
 
PROMPT:
 
Act as a senior software architect, realtime systems engineer, and WebGL performance engineer.
 
Analyze the Virtual Workspace requirements above, including the Scale & Capacity Assumptions, Organization/Reporting Structure, Compliance, and Quality Targets sections.
 
Before generating any application code:
 
1. Identify functional requirements.
2. Identify non-functional requirements.
3. Identify realtime requirements.
4. Identify 3D requirements.
5. Identify meeting requirements.
6. Identify security requirements.
7. Identify privacy concerns (including PDPA implications).
8. Identify scalability risks (against the stated concurrency assumptions).
9. Identify mobile performance risks.
Then propose:
 
* high-level architecture
* frontend architecture
* backend architecture
* realtime architecture (state whether a Redis adapter or sticky sessions are needed given the concurrency assumptions)
* WebRTC/meeting architecture
* database architecture (including reporting-structure entities)
* 3D architecture
* file storage architecture
* authentication architecture
* i18n architecture
Produce an architecture diagram using Mermaid.
 
Also define which data should use:
 
* REST / Server Actions
* WebSocket
* WebRTC
Do not implement the application yet.