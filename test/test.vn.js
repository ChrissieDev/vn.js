/**
 * @file documentation.vn.js
 * @fileoverview
 * A documented, valid VNScript to be loaded with <vn-script> inside <vn-scene>.
 */

// You can define reusable animations using ANIMATION. It returns a VNAnimation which is a Web Animations API wrapper with some extra functionality.
const transition = ANIMATION([
    { opacity: 0 },
    { opacity: 1 },
],
    {
        duration: 1000,
        // quadratic ease-out function
        easing: `cubic-bezier(0.25, 0.1, 0.25, 1)`,
        fill: `forwards`,
    }
);

// Create a scene. Commands inside are automatically parsed by the engine into VNCommand objects.
SCENE(
    
    // ADD is an object that contains all the command functions to add project-defined assets to the scene.
    // they must be defined inside the project's <vn-project> element with their default state.
    // Their element, with its default state, gets cloned and added to the scene as an instance.
    ADD.ACTOR(`bob`, {
        // applying styles to the actor instance for when they're initially added to the scene
        style: `
            opacity: 0;
        `,
    }),
    ADD.IMAGE(`classroom-day`),

    // this will animate the actor instance using the transition animation defined above. the second argument is optional and can take a 'wait' boolean value to stop the scene from executing the next command until the animation is finished.
    bob.animate(transition, { wait: true }), 

    // another way to delay execution. in this case it waits to 2 seconds after the previous command is executed
    WAIT('2s'),

    // play audio using an <audio> asset's `uid`. 'autoplay' is true by default.
    ADD.AUDIO(`everyday`, {
        volume: 0.3,
        loop: true,
    }),

    // Focuses the actor instance, setting the current speaker to its name specified in the project.
    bob
    `Hello, how are you?`,

    // `you` is an invisible actor that exists in every scene by default
    you
    `Not bad, thanks!`,

    // This adds a speaker-less textbox to the scene with a list of choices.
    PICK(
        "What do you want to say?", // Text is also okay if you want a header.

        // CHOICE adds a button to the list. The first argument is the button text, 
        // and the remaining arguments are the list commands to execute when the user chooses this option.
        CHOICE("Choice A",
            text
            `You picked choice A!`,
            `This is another block of commands that will be executed if the user picks this choice.`,
            `Once the end of the list of commands is reached, 
            the player returns to the previous context and continues executing commands from there.`,
        ),

        // You can put text between choices too.
        "<b>HTML is also supported!</b>",

        CHOICE("Choice B",
            text
            `You picked choice B!`,
            `(see above for details)`,
            PICK(
                CHOICE("Choice B-1",
                    text
                    `You picked choice B-1!`,
                ),
                CHOICE("Choice B-2",
                    text
                    `You picked choice B-2!`,
                ),
                CHOICE("Choice B-3",
                    text
                    `You picked choice B-3!`,
                ),

            )
        ),

        "Example footer text (not necessary, but just another example)",
    ),

    // running commands based on a condition ...
    IF(() => {
        return true;
    },
        bob
        `expression is true!`,
        text
        `now exiting the if statement`,
    ),
    // ... or if the condition fails ...
    ELSE(
        bob
        `expression is false!`,
        text
        `now exiting the else statement`,
    ),

    // executing arbitrary javascript code
    $(() => {
        console.log("Hello world!");
    }),

    // evaluate a string
    $(`console.log("Hello world!")`),
    
);

// making the player to run the scene
PLAY(testScene);