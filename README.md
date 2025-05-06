# vn.js
vn.js is an embeddable visual novel player written in JavaScript. It uses Web Components to create custom HTML elements that can be used to represent the state of both a scene and a project.

## Roadmap
Here's a list of functionality that is being worked on or planned for the future.

### Components
- [x] Textbox - Implemented as `<text-box>`, supports scrolling text and inline HTML. Multi-choice options use this component too.
- [x] Character - Implemented as `<vn-actor>`. An actor is a character that can be displayed in the active scene. It has a list of `<vn-layer>` elements that can be used to display different images of the character. Each layer can have a different image visible at once.
- [x] Image - Uses `<img>` elements for images and `<video>` elements for videos. Can be used to display any image or video, but is primarily used for backgrounds/foregrounds.
- [x] Music - Uses `<audio>` elements for music and sound effects.
- [x] Scene - `<vn-scene>` displays actors, images, and plays music.
- [x] Script - Loads a scene script and passes it to the VN player. Only valid inside a `<vn-scene>` element.
- [x] Project - `<vn-project>` holds the project data and assets. Every asset that can be spawned in a scene has a `uid` attribute. When an element of the same type with a `uid` is appended to the `<vn-scene>`, the scene looks up the asset in the project and copies its attributes to the new (instance) element. 
- [ ] Style - `<vn-style>` injects CSS into the Shadow DOM its parent component so components can be styled without affecting the rest of the page. You can create your own textboxes, add effects to actors, etc.
- [ ] Menu - A quick and dirty menu system with limited functionality for those who don't want to write their own.

### Script API
- [x] SCENE(...args) - Used to define a runnable script.
- [x] PICK(...args) - Creates a multi-choice option dialog. It can be passed any arbitrary string or HTML element instead of a `CHOICE` command.
- [x] CHOICE(string, ...args) - Represents a choice that can be made inside a `PICK` command. It renders a `<button>` element with the text passed into the first argument. The rest of the arguments are commands to run when the choice is made by the user.
- [x] ADD.ACTOR(uid, options?) - Adds a new actor to the scene by referencing their unique ID from the project loaded by the VN player.
- [x] ADD.IMAGE(uid, options?) - Adds a new image to the scene by referencing its unique ID from the project loaded by the VN player.
- [x] ADD.AUDIO(uid, options?) - Adds a new audio to the scene by referencing its unique ID from the project loaded by the VN player.
- [x] $(...args) - Run a function or evaluate an expression in the context of the scene. This is useful for running your own code exactly when the command is executed at runtime. It can also be used to select objects in the scene and set their properties using a jQuery-like syntax.
- [x] ANIMATION(keyframes, options?, onFinish?) - Creates a reusable animation that can be used to animate any object in the scene using objectName.animate(animationName, options?). Returns a VNAnimation object that is a simple wrapper around the Web Animations API.
- [x] WAIT(time) - Pauses the script for a specified amount of time. Accepts a number in seconds, or a time string (e.g. "1s", "1m", "1h").
- [ ] RETURN(...) - Return from the current block of the script and continue in the parent block. Works the same as `return` in most programming languages.
- [ ] RUN(scene) - Run a different scene from the current one.
- [ ] LOAD(project) - Load a project from a file or URL.
- [ ] SAVE(project) - Save the state of the player for later use with the current project. Returns a JSON object that can be saved to a file or sent to a server.
- [ ] TRANSITION.IN(animation) - Set the transition animation going into the scene. Takes a VNAnimation + options or keyframes + options.
- [ ] TRANSITION.OUT(animation) - Set the transition animation going out of the scene. Takes a VNAnimation + options or keyframes + options.

### Visual Editor
(Not started)

## Testing
1. Clone the repository
```sh
git clone https://github.com/mkgiga/vn.js
```
2. Serve the HTML file `/test/index.html` using something like VS Code's [Live Preview]("https://marketplace.visualstudio.com/items?itemName=ms-vscode.live-server") or similar and open it in your browser.
