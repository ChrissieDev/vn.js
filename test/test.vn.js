/**
 * @file test.vn.js
 * This is a test script/an informal specification to follow when implementing the scripting system in the VNPlayerElement.
 * We'll build onto this as we continue to implement the engine.
 */

let user = 'Anon';

const fadeIn = ANIMATION(
    [
        { opacity: 0, filter: 'brightness(1) grayscale(0)' },
        { opacity: 1, filter: 'brightness(1) grayscale(0)' },
    ],
    {
        duration: 2000,
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
    
    $(function () {
        haruka.reputation = {
            you: 50,
        };
    }),

    ADD.IMAGE(`back-of-classroom-day`),

    haruka
    `<ruby>
        漢
        <rp>
            (</rp><rt>kan</rt><rp>)
        </rp>
        字
        <rp>
            (</rp><rt>ji</rt><rp>)
        </rp>
    </ruby>
    `,
        
    ADD.AUDIO(`everyday`, {
        volume: 0.05,
    }),

    haruka
    `I've been thinking lately... Um...`,

    text
    `<em>It's apparent that Haruka is trying to get something off her chest---You can tell by the way she <b>fidgets</b> with her hands and avoids eye contact.</em>`,

    PICK(
        "(Header text) What do you want to say?",

        CHOICE(
            "I don't have time for this.",

            you
            `I don't have time for this.`,

            haruka
            `Oh, um...`,
        ),

        CHOICE(
            "What's up?",

            you
            `What's up?`,

            haruka
            `I... I just wanted to ask you something...`,
        ),

        "Footer text.",
    ),

    haruka
    `Well, you know how you borrowed my Dora the Explorer sneakers?`,
    `It's just that... It's been three weeks and like, um...`,

    text
    `She looks like she might burst into tears any second now.`,

    you
    `I said I'd return them, didn't I?!`,
    you
    `Are you really going to cry over a pair of sneakers?`, // multiple lines by 'you' cause it to be treated as monologue, need fix
    
    haruka.animate([
        { transform: 'rotate(0deg) scale(1.7)', transformOrigin: 'center center' },
        { transform: 'rotate(180deg) scale(1.7)', transformOrigin: 'center center' },
    ], {
        duration: 500,
        easing: 'linear',
        fill: 'forwards',
    }),
    
    $(() => {
        haruka.reputation.you -= 40;
    }),

    haruka
    `Uh... I... Um...`,

    haruka
    `I know, but...`,

    you
    `They're not even cute, and they weren't my size so I threw them out.`,

    haruka
    `You threw them out?!`,

    text
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
PLAY(testScene);