==================================================
PHASE 1 — PROJECT STRUCTURE
===========================
 
PROMPT:
 
Using the approved architecture, design the complete repository structure.
 
The structure should clearly separate:
 
* normal UI
* business logic
* realtime networking
* meeting system
* authentication
* database
* 3D scenes
* avatars
* rooms
* task board
* file submission
* work sessions
* activity monitoring
* i18n/locale files
Suggested direction:
 
src/
app/
components/
ui/
workspace/
meeting/
taskboard/
three/
features/
auth/
attendance/
activity/
presence/
rooms/
tasks/
submissions/
meetings/
hooks/
lib/
services/
stores/
types/
 
public/
models/
textures/
images/
 
locales/
th/
en/
 
Do not create unnecessary abstractions.
 
Explain the responsibility of each major folder.
 
Then initialize the project with the minimum required dependencies.
 
Do not implement business features yet.