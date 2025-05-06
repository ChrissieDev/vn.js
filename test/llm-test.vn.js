// Defining reusable animations
const fadeIn = ANIMATION(
    [
        { opacity: 0, transform: 'translateX(-40px) scale(0.95)' }, // Start slightly off-screen, smaller and transparent
        { opacity: 1, transform: 'translateX(0px) scale(1)' }    // Fade in, slide into place and scale up
    ],
    {
        duration: 700,
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', // easeOutQuad
        fill: 'forwards'
    }
);

const fadeOut = ANIMATION(
    [
        { opacity: 1, transform: 'translateX(0px) scale(1)' },
        { opacity: 0, transform: 'translateX(40px) scale(0.95)' } // Fade out, slide off-screen and scale down
    ],
    {
        duration: 500,
        easing: 'cubic-bezier(0.55, 0.085, 0.68, 0.53)', // easeInQuad
        fill: 'forwards'
    }
);

const subtleBounce = ANIMATION(
    [
        { transform: 'translateY(0px)' },
        { transform: 'translateY(-5px)' },
        { transform: 'translateY(0px)' }
    ],
    {
        duration: 350,
        easing: 'ease-in-out',
        // iterations will be specified in the animate call if different from 1
    }
);

const dramaticExitSweep = ANIMATION(
    [
        { opacity: 1, transform: 'translateX(0px) rotate(0deg) scale(1)' },
        { opacity: 0.8, transform: 'translateX(150px) rotate(8deg) scale(1.05)' },
        { opacity: 0, transform: 'translateX(600px) rotate(20deg) scale(1.1)' }
    ],
    {
        duration: 1200,
        easing: 'cubic-bezier(0.6, -0.28, 0.735, 0.045)', // easeInBack
        fill: 'forwards'
    }
);

const scene = SCENE(
    // Set up the classroom background with a gentle fade-in
    ADD.IMAGE('classroom-day', {
        style: 'opacity: 0; width: 100%; height: 100%; object-fit: cover;' // Initial state for fade-in
    }),
    (async () => { // IIFE to animate the background
        const bgImage = document.querySelector('img[src$="classroom-day"]'); // A bit fragile selector, assumes only one
        if (bgImage) {
            await bgImage.animate(
                [{ opacity: 0 }, { opacity: 1 }],
                { duration: 2000, easing: 'ease-in', fill: 'forwards' }
            ).finished;
        }
    })(),

    WAIT(1000), // Allow background to start fading in

    ADD.AUDIO('everyday.mp3', {
        volume: 0.35,
        loop: true,
    }),

    // Add Kacey, initially off-screen or invisible, then animate her in
    ADD.ACTOR('kacey', {
        style: 'transform: translate(250px, 40px) scale(0.85); opacity: 0;', // Positioned to the right, slightly down, smaller
    }),

    text
    `The lecture hall is filled with the low murmur of the professor's voice, a sound that has become synonymous with "nap time" for most students.`,
    `You doodle idly in your notebook, occasionally glancing at Kacey beside you. She looks like a powder keg with a very short, very Chanel-branded fuse.`,

    kacey.animate(fadeIn, { wait: true }), // Kacey fades/slides in

    kacey
    `Okay, I am, like, literally one more PowerPoint slide away from a full-blown existential crisis.`,
    `This history lecture is, like, older than the history it's talking about.`,
    
    kacey.animate(subtleBounce, { iterations: 3, duration: 300 }), // Kacey fidgets

    kacey
    `And this lighting? It's, like, totally washing out my complexion. This is a travesty.`,

    you
    `(<i>A Kacey-meltdown is imminent. Level: Mauve Alert.</i>)`,

    PICK(
        `Kacey turns to you, eyes wide with a desperate plea for entertainment. "What should we do?" her expression screams.`,

        CHOICE(`"Starbucks run? My treat for enduring this."`,
            you
            `How about a strategic retreat to Starbucks? My treat. You look like you need a triple-shot-venti-something-complicated.`,

            kacey
            `OMG, do I? You, like, totally get me!`,
            `Yes! A Venti Iced Caramel Macchiato with, like, extra extra caramel drizzle and, like, five pumps of vanilla. Stat!`,
            `And we can, like, "accidentally" forget to come back. Whoops!`,

            you
            `"Accidentally," of course. Your definition of "accident" is always so... intentional.`,
            `But okay, caffeine and truancy it is. Lead the way, Queen of Questionable Decisions.`,

            kacey
            `Don't mind if I do!`,
            `Let's leave these, like, historical peasants to their ancient ramblings!`,

            REMOVE.AUDIO('everyday.mp3'),
            ADD.AUDIO('menacing.ogg', { volume: 0.25, loop: true }), // More upbeat, mischievous tune

            kacey.animate(fadeOut, { wait: true }),
            
            text
            `Kacey is already halfway out of her seat, her expensive bag slung over her shoulder.`,
            `You sigh, grabbing your own stuff. Another Monday, another Kacey-led escape from academic tedium.`,
            `At least there'll be good coffee.`
        ),

        CHOICE(`"Let's make our OWN history. Prank Professor Davies?"`,
            you
            `You know, if this lecture is so boring, maybe we should, like, make our own history.`,
            `Professor Davies' office hours are next period, right? And he always leaves his door unlocked...`,

            kacey
            `...Are you suggesting what I think you're suggesting?`,
            `Because if it involves, like, replacing all his pens with ones that write in glitter, or, like, covering his entire desk in sticky notes saying "History is, like, so fetch!" then I am SO in.`,
            `You're, like, surprisingly devious sometimes. I approve.`,

            you
            `Glitter pens are a classic. But I was thinking bigger. Remember how he's, like, terrified of rubber ducks?`,

            kacey
            `OMG! The Great Rubber Duck Invasion of '24! It's, like, poetic!`,
            `I have, like, at least three in my bag from that claw machine we conquered last week! And I think Tiffany has some...`,
            
            REMOVE.AUDIO('everyday.mp3'),
            ADD.AUDIO('menacing.ogg', { volume: 0.4, loop: true }),

            kacey
            `Okay, new plan. We text Tiffany, coordinate a, like, multi-pronged duck assault on Davies' office.`,
            `This is going to be LEGENDARY.`,

            you
            `Just try not to get us expelled... again. My parents are still recovering from the "mascot kidnapping" incident.`,

            kacey
            `Details, details. It's for the art, sweetie!`,
            `Come on, General Duckington, our troops await!`,

            kacey.animate(dramaticExitSweep, { wait: true }),
            
            text
            `Kacey practically vibrates with excitement, already typing furiously on her phone as she sweeps out of the lecture hall.`,
            `You can't help but grin. This is definitely going to be more interesting than learning about the Peloponnesian War. Probably.`
        ),

        CHOICE(`"Deep breaths, Kacey. Want to compare online shopping carts?"`,
            you
            `Okay, deep breaths, Kacey. Before you, like, spontaneously combust from boredom.`,
            `Want to, like, discreetly compare our ASOS shopping carts? I found this amazing faux fur jacket...`,

            kacey
            `Shopping carts? Are you, like, serious right now?`,
            `While ROME is BURNING? Or, like, whatever historical catastrophe Davies is droning on about?`,
            
            kacey.animate(subtleBounce, { iterations: 1, duration: 200 }), // A short, annoyed bounce

            kacey
            `But... okay, fine. But only because my cart is, like, definitely better than yours.`,
            `I have these, like, knee-high snakeskin boots that are to DIE for.`,
            `And if Davies calls on me, you're, like, totally answering for me. Deal?`,

            you
            `Deal. But if my faux fur jacket is better than your snakeskin boots, you owe me a smoothie.`,

            kacey
            `As if! But you're on. Just, like, try not to drool all over your phone when you see my selections.`,

            text
            `Kacey pulls out her diamond-encrusted phone, expertly navigating to her favorite shopping app under the cover of her textbook.`,
            `You do the same, a small smile playing on your lips. Sometimes, the simplest distractions are the best.`,
            `The threat of a Kacey-meltdown has been downgraded to Chartreuse. For now.`
        )
    )
);

PLAY(scene);