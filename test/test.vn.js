/**
 * @file test.vn.js
 * This is a test script/an informal specification to follow when implementing the scripting system in the VNPlayerElement.
 * We'll build onto this as we continue to implement the engine.
 */

let user = 'Anon';

const fadeIn = ANIMATION(
    [
        { opacity: 0 },
        { opacity: 1 }
    ],
    {
        duration: 1000,
        easing: 'ease-in-out',
        fill: 'forwards',
    },
    () => {
        console.log('Animation complete!');
    }
);

const testScene = SCENE(

    // actor and background image doesn't fit the example dialogue but whatever i'm just testing lol
    ADD.ACTOR(`haruka`, {
        style: `opacity: 0;`,
    }),

    ADD.IMAGE(`back-of-classroom-day`),
    
    haruka
    `Hey, It's me again, ${haruka.NAME}...`,
    `Hey, ${user}, do you have a moment?`,

    haruka.ANIMATE(fadeIn),
    
    haruka
    `I was thinking about what we talked about the other day.`,

    


)

// Testing to see what value SCENE(...) returns
console.log(testScene);

// running the script
/** @todo make this asynchronous so a scene can return something when they're done */
play(testScene);