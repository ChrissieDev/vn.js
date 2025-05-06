const scene = SCENE(
    ADD.ACTOR(`kacey`, {
        style: `transform: translate(0px, 0px) scale(1);`,
    }),

    function() {
        // initialize kacey actor
        kacey.rep = {
            you: 100,
            takeno: 0,
            akira: 0,
            takazawa: 0,
        }
    },

    ADD.IMAGE(`back-of-classroom-day`),
    
    START,

    WAIT(4),

    ADD.AUDIO(`everyday`, {
        volume: 0.4,
    }),

    kacey
    `This class is so lame.`,
    `I wish I could just go home and play The Sims 4 all day.`,
    `Don't you think so, Harumi-kun?`,

    PICK(
        `Kacey is looking at you.`,
        CHOICE(`You've got enough tardies!`,
            text
            `You laugh at Kacey's comment.`,

            you
            `You lazy bum! You can't just skip class! You already have like, 5 tardies this week!`,

            kacey
            `Whatever!`,
        ),
        CHOICE(`I knooow, right?`,
            you
            `I knooow, right? It's so boring! We already know all this stuff!`,

            function() {
                kacey.rep.you += 20;
            },

            kacey
            `By the way, I spotted Takeno-sensei at an anonymous gay truck stop last night!`,

            you
            `No way! Are you serious?`,

            kacey
            `I'm dead serious! He was like, on the restroom floor on all fours, like, begging for it!`,
            `We should totally like, tail him so we can snap some pics, then blackmail him for extra credit!`,

            you
            `You're so freakin' smart! But aren't you forgetting something?`,

            kacey
            `...`,

            you
            `We can't blackmail him if we're like, super hungry and stuff! Let's drop by the konbini for some snacks!`,

            text
            `You and Kacey burst out laughing.`,

            kacey
            `Oh my god, you're so right!`,
        )
    )

)

PLAY(scene);