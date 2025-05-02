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
        duration: 4000,
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

    $(() => {
        haruka.reputation = {
            you: 50,
        };
    }),

    ADD.IMAGE(`back-of-classroom-day`),
    // SELECT(`back-of-classroom-day`).animate(fadeIn, { wait: true }),
       
    haruka
    `Hey, ${user}, do you have a moment?`,

    haruka.animate(fadeIn, {
        wait: true,
    }),
    
    haruka
    `I've been thinking lately... Um...`,

    TEXT
    `It's apparent that Haruka is trying to get something off her chest---You can tell by the way she fidgets with her hands and avoids eye contact.`,

    haruka
    `Well, you know how you borrowed my Dora the Explorer sneakers?`,
    `It's just that... It's been three weeks and like, um...`,

    TEXT
    `She looks like she might burst into tears any second now.`,

    you
    `I said I'd return them, didn't I?!`,
    `Are you really going to cry over a pair of sneakers?`, // multiple lines by 'you' cause it to be treated as monologue, need fix

    $(() => {
        haruka.reputation.you -= 40;
    }),

    haruka
    `Uh... I... Um...`,

    you
    `I said I'd return them, didn't I?!`,

    haruka
    `I know, but...`,

    you
    `They're not even cute, and they weren't my size so I threw them out.`,

    haruka
    `You threw them out?!`,

    TEXT
    `Haruka's eyes widen in disbelief. She begins to sob.`,

    you
    `Not this bullshiiit again...`,

    haruka
    `How could you... How could you do something like that...?`,
)

// Testing to see what value SCENE(...) returns
console.log(testScene);

// running the script
/** @todo make this asynchronous so a scene can return something when they're done */
play(testScene);