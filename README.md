# VN.js

This is a visual novel engine/player that is embeddable on any HTML page!
It lets you create visual novels via a JavaScript API that abuses various JavaScript quirks to make it look less intimidating to the average person.

### Example Scene

```js
START(
    shinji
    `I'm not sure what to do anymore...`,

    _
    `There's static hissing through the radio, then, an intermission...`,

    IF(() => cockpit.pilot !== "shinji",
        misato
        `Shinji, get in the damn robot!`,
        asuka
        `Yeah Shinji, you stupid asshole! God, I can't stand you! I hate you!`,

        function() { shinji.state.stress += 10 },
    ),
    ELSE(
        misato
        `You're doing great, Shinji!`,
    ),

    _
    `Shinji is about to have a mental breakdown.`,
)
```

# How does it work?

1. The player, scene, and current loaded project are all web components. (see [Web Components](https://developer.mozilla.org/en-US/docs/Web/Web_Components) to learn more about them)
2. State, as in the current scene and loaded project, are both stored in the DOM using these web components. It opens up a lot of possibilities for the future, such as rendering visual novels from a server-side script.
3. Visual novel scenes (scripts) may be loaded by either calling `VNPlayer.runScript(script)` or by adding a `<vn-script>` element as a child of the `<vn-scene>` element.

### Example DOM structure

```html
<vn-player>
    <!-- The <vn-project> is invisible on the page and contains all the information about the VN. -->
    <vn-project itemprops>
        <!-- Project metadata -->
        <meta name="name" content="Untitled Project">
        <meta name="description" content="A sample visual novel project.">
        <meta name="version" content="1.0.0">
        <meta name="author" content="Anonymous">
        <meta name="license" content="">
        <meta name="language" content="en">
        
        <!-- Loadable assets all have a `uid` attribute. -->
        <img uid="background" src="images/background.png">
        <audio uid="bgm-happy" src="audio/bgm-happy.mp3">
        <vn-object uid="shinji">
            <img uid="shinjiBase" src="assets/shinji.png">
            <img uid="shinjiSad" src="assets/shinji_sad.png">
            <img uid="shinjiHappy" src="assets/shinji_happy.png">
        </vn-object>
    </vn-project>
    
    <!-- Elements inside <vn-scene> reference project assets using their `uid` attribute. -->
    <vn-scene>
        <img uid="background">
    </vn-scene>
</vn-player>
```

# Internal Structure

### VNPlayer `/components/vn-player.js`
It is the main component that gets the wheels turning. It defines an internal API for scene scripts. When a \<vn-script\> is added to the scene, API functions are copied from `VNPlayer.#runtimeAPI` -> `VNPlayer.#runtime`, which serves as the top-level context which the script runs in only beneath `globalThis`. Incidentally, this means that you can't use ES modules to import other javascript libraries unless you use a bundler or expose them to the global scope in a different \<script\> before running the scene.

### VNProject `/components/vn-project.js`
The component that loads and stores a VN project to be played by the player. It loads images, audio, and other assets into the DOM as children of the `<vn-project>` element. These assets are accessed by any scene script by referencing their `uid` attribute (unique identifier).

It also contains metadata about the project, such as the name, description, version, author, license, and language. This metadata is stored in `<meta>` elements inside the `<vn-project>` element.

> [!WARNING]
> Missing \<meta\> tags for `name`, `description`, `version`, `author`, and `license` will cause whichever tag is missing's value to be set to an empty string when loaded. A missing `<meta name="name">` results in your project's name not being rendered wherever you use it in the VN.

### VNScene `/components/vn-scene.js`
The \<vn-scene\> is responsible for rendering the scene visually to the player and playing audio/video. It is always a direct child of the \<vn-player\> element. 

There is a `MutationObserver` that watches for changes to its own DOM tree and categorizes certain elements into different slots when no `slot` attribute is present.

The scene currently makes a distinction between two types of content:

- Scene content (slot: `objects`)
  
    Any elements that belong to the environment of the scene, such as `<vn-object>`, `<img>`, `<audio>`, `<video>`, etc.

- Textbox elements (slot: `textboxes`)
  
    UI like dialogue or interactive choices to appear above everything else in the scene. The slot name will probably change to `ui` soon.