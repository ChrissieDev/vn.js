/**
 * @file documentation.vn.js
 * @fileoverview
 * A documented, valid VNScript to be loaded with <vn-script> inside <vn-scene>.
 */

// You can define reusable animations using ANIMATION. It returns a VNAnimation which is a Web Animations API wrapper with some extra functionality.
const fadeIn = ANIMATION([
    { opacity: 0 },
    { opacity: 1 },
],
    {
        duration: 4000,
        easing: `linear`,
        fill: `forwards`,
    }
);

// Create a scene. Commands inside are automatically parsed by the engine into VNCommand objects.
const testScene = SCENE(
    
    // ADD is an object that contains all the command functions to add project-defined assets to the scene.
    // they must be defined inside the project's <vn-assets> element with their default state.
    // Their element, with its default state, gets cloned and added to the scene as an instance.
    ADD.ACTOR(`haruka`, {
        style: `opacity: 0;`,
    }),

    ADD.IMAGE(`back-of-classroom-day`),
    ADD.AUDIO(`everyday`, {
        volume: 0.05,
    }),

    // Actors may be referenced as variables in the script. They are automatically added to the context when added to the scene.
    // No need to write `this.haruka`, although this is also valid.
    haruka
    `Hello, world!`, // An actor variable is a template literal function, which makes this valid javascript.
    `My name is ${haruka.name}.`, // Consecutive strings are automatically associated with the actor whose template literal function was last called.
    
    
    // Even though actor variables are functions, they can have properties like any javascript object.
    // actor.animate() is a function that takes a VNAnimation and applies it to the actor's element.
    haruka.animate(fadeIn, { wait: true }),

    // Wait for half a second before executing the next command.
    WAIT("0.5s"), 
    WAIT(500), // This is also valid.

    // the text command displays a textbox with no speaker/title.
    text`This is a dialogue box with no speaker.`,

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
        ),

        "Footer text",
    ),

    // running commands based on a condition ...
    IF(([]) === true,
        haruka
        `expression is true!`,
        text
        `now exiting the if statement`,
    ),
    // ... or if the condition fails ...
    ELSE(
        haruka
        `expression is false!`,
        text
        `now exiting the else statement`,
    ),

    // Execute a function at runtime.
    $(function () {
        console.log(`This function is executed when the command is reached.`);
    }),

    // Evaluate a string as javascript.
    $(`
        console.log("Hello, eval! This is okay because we are already running user code. It is up to the user to avoid executing malicious code here."); 
    `),

    $(`back-of-classroom-day`)?.animate?.(fadeIn, { wait: true }), // You can also use the $ command to get elements by their unique id.
);

// signaling the player to run the scene
PLAY(testScene);