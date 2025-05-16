# VN.js

Hey, I'm making a visual novel player for the web called VN.js! It's a work in progress, but I think it'll be pretty cool when it's done. The state is stored in the DOM - because of this, state is alway serializable and may be saved to a file or even be streamed from a server. The player is designed for use in a web browser and leverages existing web technologies like HTML and CSS to allow for true customization of the visual novel experience, whether that is through custom themes (via CSS overrides) or bringing your own custom elements to the table (todo documentation on this).

# How does it work?

We have a <vn-player> element which contains a <vn-project> and a <vn-scene> respectively.

```html
<vn-player>
    <!-- The <vn-project> is invisible and contains all the assets for the VN. -->
    <vn-project>
        <img uid="background" src="assets/background.png" />
    </vn-project>
    
    <!-- Elements inside <vn-scene> reference project assets using their `uid` attribute. -->
    <vn-scene>
        <img uid="background">
    </vn-scene>
</vn-player>
```

#### \<vn-project\>
An invisible element that contains copies of all instantiable assets used in the visual novel.

#### \<vn-scene\>
Any element added to this component with a `uid` attribute will be synced with its corresponding asset in the project. In the example above, the `background` image from `<vn-project>` becomes copied to the `<vn-scene>` using just its `uid` attribute.

# Structure

`/components/vn-player.js` is the main component that gets the wheels turning. It defines an internal API for scene scripts. When a \<vn-script\> is added to the scene, global functions are copied from `VNPlayer.#runtimeAPI` -> `VNPlayer.#runtime`, which is the context which the script runs in. Here is a small example of how scripts are run:

```javascript
START(
    bob
    `Hello, world! Notice how we don't need commas between arguments?`
    `It's because we're chaining string template literal function calls!`,

    bob
    `Also, the API severely abuses variadic arguments for everything
    that results in an array of commands to be executed at runtime.`
)
```