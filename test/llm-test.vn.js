/**
 * @file schoolDayScene.vn.js
 * @fileoverview
 * A VNScript scene depicting the start of a school day with Kacey.
 */

// Reusable animation for actors fading in
const actorFadeIn = ANIMATION(
    [
        { opacity: 0, transform: 'translateX(-30px)' }, // Start slightly off-screen and transparent
        { opacity: 1, transform: 'translateX(0px)' }    // Fade in and slide into place
    ],
    {
        duration: 800,
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', // easeOutQuad
        fill: 'forwards'
    }
);

// Reusable animation for actors fading out (if needed later)
const actorFadeOut = ANIMATION(
    [
        { opacity: 1, transform: 'translateX(0px)' },
        { opacity: 0, transform: 'translateX(30px)' }
    ],
    {
        duration: 500,
        easing: 'cubic-bezier(0.55, 0.085, 0.68, 0.53)', // easeInQuad
        fill: 'forwards'
    }
);

// Define the scene
PLAY(SCENE(
    // Setup the environment: background image and ambient music
    ADD.IMAGE('classroom-day', {
        style: `
            width: 100%;
            height: 100%;
            object-fit: cover;
        `
    }),
    ADD.AUDIO('everyday', {
        volume: 0.35,
        loop: true,
        // autoplay is true by default
    }),

    // Player character's initial thoughts before Kacey arrives
    you
    `Ugh, another thrilling day at Northwood High. The scent of floor wax and teenage angst is already intoxicating.`,
    WAIT('0.5s'),
    you
    `At least Kacey will be here soon. She's a hurricane of chaos, but it's my kind of chaos.`,
    WAIT('1s'),

    // Kacey makes her entrance
    ADD.ACTOR('kacey', {
        style: `
            opacity: 0;
            /* Initial position can be adjusted if needed, e.g., for side entrances */
            /* bottom: 0; left: 10%; */
        `,
    }),
    // Animate Kacey appearing on screen
    kacey.animate(actorFadeIn, { wait: true }),

    // Dialogue starts
    kacey
    `Oh. My. God. Could this classroom BE any more depressing? The color scheme is, like, an actual crime against fashion.`,

    you
    `Morning to you too, Kacey. And I think "institutional beige" is the technical term.`,

    kacey
    `Whatever. It's hideous. Seriously, if I have to stare at these walls all day, I'm going to, like, demand hazard pay.`,
    kacey
    `Anyway, did you finish that history assignment? Because I, like, *totally* forgot. Mr. Henderson is going to have a full-blown meltdown.`,

    you
    `Finished it last night. It wasn't that bad, just a lot of reading about dead guys.`,

    kacey
    `Ugh, reading. So archaic. Why can't they just make a TikTok about it?`,
    kacey
    `Speaking of which, you will NOT believe what Brittany wore yesterday. It was this, like, tragic ruffled top that looked like a confused flamingo. I almost died.`,

    you
    `I'm sure it wasn't *that* bad. Maybe she was trying a new style?`,

    kacey
    `Honey, there's "new style" and then there's "cry for help." That was definitely a full-on S.O.S.`,
    kacey
    `So, big plans after we escape this educational prison? Because we are *definitely* hitting up that new boutique downtown. I heard they have killer accessories, and your wardrobe could, like, use a little... sparkle.`,

    // Player makes a choice
    PICK(
        "Kacey wants to go shopping. How do you respond?",

        CHOICE("Agree immediately",
            you
            `"A new boutique? Say no more! My closet is practically begging for an intervention."`,
            kacey
            `"See? This is why you're my bestie! You just *get* it. We'll find you something so fierce, people will, like, actually notice you for the right reasons."`,
            text
            `Kacey claps her hands, already picturing the shopping spree.`,
        ),

        CHOICE("Express some hesitation",
            you
            `"Downtown on a school day? Sounds a bit ambitious, and probably expensive. My wallet's still recovering from last time."`,
            kacey
            `"Oh, don't be such a party pooper! It's called investing in yourself. And who knows, maybe we'll 'accidentally' bump into some cute guys."`,
            kacey
            `"Come on, it'll be fun! My treat for the first overpriced latte."`,
            you
            `"Okay, okay, you twisted my arm. But only one latte!"`,
        ),

        CHOICE("Suggest something else",
            you
            `"Actually, I was thinking maybe we could grab some food and then just chill? Maybe catch up on that show everyone's talking about?"`,
            kacey
            `"Chill? With all those new arrivals just waiting to be discovered? Are you, like, feeling okay? That's almost as tragic as Brittany's top."`,
            kacey
            `"But... okay, fine. Food first. Then *maybe* chilling. But if I get bored, we're bailing and going shopping anyway, deal?"`,
            you
            `"Deal. I'll brace myself for the inevitable."`,
        )
    ),

    kacey
    `Okay, well, try not to look too bored in Henderson's class. It, like, totally ruins my concentration when you sigh dramatically.`,
    kacey
    `Later, loser! Don't be late!`,

    // Kacey could exit here if the scene continued with her leaving
    // kacey.animate(actorFadeOut, { wait: true }),
    // REMOVE.ACTOR('kacey'), // Or simply make her invisible if she stays in the background

    text
    `The first bell shrills through the hallway, a signal that the day is truly beginning. Time to face the music... or, in this case, history class.`
));