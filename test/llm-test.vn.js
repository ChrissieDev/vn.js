// Define reusable animations
const slideInFromLeft = ANIMATION(
    [
        { opacity: 0, transform: 'translateX(-150px) scale(0.8)' },
        { opacity: 1, transform: 'translateX(0px) scale(1)' }
    ],
    {
        duration: 800,
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', // easeOutQuad
        fill: 'forwards'
    }
);

const slideOutToRight = ANIMATION(
    [
        { opacity: 1, transform: 'translateX(0px) scale(1)' },
        { opacity: 0, transform: 'translateX(150px) scale(0.8)' }
    ],
    {
        duration: 600,
        easing: 'cubic-bezier(0.55, 0.085, 0.68, 0.53)', // easeInQuad
        fill: 'forwards'
    }
);

const subtleShake = ANIMATION(
    [
        { transform: 'translateX(0px) rotate(0deg)' },
        { transform: 'translateX(-2px) rotate(-0.5deg)' },
        { transform: 'translateX(2px) rotate(0.5deg)' },
        { transform: 'translateX(-2px) rotate(-0.5deg)' },
        { transform: 'translateX(2px) rotate(0.5deg)' },
        { transform: 'translateX(0px) rotate(0deg)' }
    ],
    {
        duration: 400,
        easing: 'ease-in-out',
        iterations: 1
    }
);

const headToss = ANIMATION(
    [
        { transform: 'translateY(0px) rotateZ(0deg)' },
        { transform: 'translateY(-10px) rotateZ(-3deg)' },
        { transform: 'translateY(0px) rotateZ(3deg)' },
        { transform: 'translateY(0px) rotateZ(0deg)' }
    ],
    {
        duration: 500,
        easing: 'ease-in-out'
    }
);

const scene = SCENE(
    // Scene Setup
    ADD.IMAGE(`classroom-day`, { style: `z-index: -1; filter: blur(1px);` }),
    ADD.AUDIO(`everyday.mp3`, { volume: 0.35, loop: true }),
    ADD.ACTOR(`kacey`, {
        style: `transform: translate(200px, 0px) scale(1.05); opacity: 0;` // Positioned to the right, slightly larger
    }),
    
    WAIT(0.5),
    kacey.animate(slideInFromLeft, { wait: true }),

    function() {
        // Initialize Kacey's mood. Higher is better.
        kacey.mood = 55; 
        // A variable to track if the prank is agreed upon
        kacey.prankAgreed = false;
    },

    text
    `The morning sun filtered weakly through the grimy classroom windows. Another thrilling day at Northwood High. Yay.`,
    `Kacey was already at her desk, idly twirling a pen and looking, like, monumentally bored.`,

    kacey
    `Ugh, my actual soul is, like, shriveling in this place. If I have to listen to Mr. Harrison drone on about the socio-economic impact of, like, ancient pottery for one more minute, I'm staging a walkout.`,
    `And his breath? It could, like, curdle milk from across the room. Seriously.`,

    you
    `Tell me about it. I swear, I saw a moth fly out of his mouth yesterday during third period.`,
    `And don't even get me STARTED on the homework load. My fingers are, like, permanently cramped into claw shapes.`,

    kacey
    `Ew, a moth? Okay, that's, like, a new level of gross, even for him.`,
    kacey.animate(subtleShake, { wait: false }), // Kacey shivers in disgust
    `But, like, speaking of Harrison... I had this, like, epically evil idea last night while I was supposed to be reading that snooze-fest chapter he assigned.`,
    `(She leans in, her eyes glinting with a familiar, dangerous sparkle.)`,
    `It's time for a little... creative redecorating. Of his coffee.`,

    // Stop 'everyday' music and start 'menacing'
    REMOVE.AUDIO(`everyday.mp3`, { fade: 1 }), // Fade out over 1 second
    ADD.AUDIO(`menacing.ogg`, { volume: 0.4, loop: true, delay: 0.5 }), // Start after a short delay

    you
    `His coffee? Kacey, what kind of horror show are you cooking up now? Remember the Great Glitter Incident of sophomore year? The janitors are, like, still finding sparkles.`,

    kacey
    `Pfft, that was, like, performance art, and you know it! This is way more subtle. And way funnier.`,
    `So, I "borrowed" this, like, super-potent, industrial-strength green food coloring from the home ec room. The kind they use for, like, alien-themed cupcakes?`,
    `Imagine old man Harrison, sipping his sad little lukewarm coffee, and then BAM! His teeth, his tongue, his soul... all Shrek green for, like, a week!`,
    kacey.animate(headToss, { wait: false }),
    `It'll be, like, so iconic. But I need a lookout. And maybe a little distraction. You in, bestie?`,

    PICK(
        `Kacey looks at you, a Cheshire cat grin plastered on her face. This could go very well, or very, very badly.`,

        CHOICE(`"OMG, yes! Count me in, you evil genius!"`,
            function() { kacey.prankAgreed = true; kacey.mood += 20; },
            you
            `OMG, yes! Kacey, you're, like, a total evil genius! Shrek-Harrison? That's comedy gold! I am SO in.`,
            
            kacey
            `I KNEW you'd get it! That's why you're my, like, ride-or-die! Okay, okay, focus!`,
            `He always leaves his precious thermos on the corner of his desk when he goes to, like, "commune with the copy machine" before class.`,
            `You create a diversion – maybe, like, a sudden, dramatic nosebleed? Or, like, start passionately reciting Shakespeare? Whatever works.`,
            `While he's dealing with your theatrics, I swoop in, do the deed, and we're golden. Or, well, he's green.`,
            
            you
            `Consider it done! Operation Ogre Mouth is a go! This is gonna be, like, legendary.`
        ),

        CHOICE(`"Kace, are you sure? If we get caught, we're actual toast."`,
            function() { kacey.mood -= 10; },
            you
            `Kace, are you, like, totally sure about this? Harrison has, like, CIA-level spy skills when it comes to classroom shenanigans. If we get caught, we're actual toast. Possibly expelled-flavored toast.`,

            kacey
            `Ugh, don't be such a, like, drama queen! Expelled? For a little food coloring? Please.`,
            kacey.animate(subtleShake, { wait: false }),
            `Where's your sense of, like, adventure? Your joie de vivre? Is it hiding under that, like, ridiculously sensible cardigan?`,
            `Come on, it'll be hilarious! And I really, like, don't wanna do this alone. It's always more fun with my partner-in-crime.`,
            `(She gives you a little pout, actually looking a tiny bit vulnerable under the usual queen bee facade.)`,

            PICK(
                `Kacey's playing the bestie card. It's surprisingly effective.`,
                CHOICE(`"Alright, alright, you convinced me. But you owe me big time."`,
                    function() { kacey.prankAgreed = true; kacey.mood += 25; }, // Mood boost for convincing
                    you
                    `Ugh, fiiine. Alright, alright, you convinced me with that, like, totally manipulative pout. But you owe me BIG time. Like, new shoes big time.`,
                    kacey
                    `Deal! But they better be, like, cute shoes. Now, let's talk strategy for Operation Ogre Mouth...`
                ),
                CHOICE(`"Sorry, Kace. I can't risk it. My mom would literally ground me into dust."`,
                    function() { kacey.mood -= 15; },
                    you
                    `I'm sorry, Kace. I just... I can't risk it. My mom would, like, literally ground me into dust and then scatter my remains over a community college application.`,
                    kacey
                    `Wow. Okay. So much for, like, loyalty. Fine. Be boring. I guess I'll just have to find someone else who's, like, actually fun. Or maybe this school is just, like, doomed to be lame forever.`,
                    `(Kacey turns away, clearly miffed. The sparkle in her eyes is gone, replaced by a frosty glare she usually reserves for, like, last season's fashion.)`
                )
            )
        ),

        CHOICE(`"Hmm, sounds risky. What's in it for me?"`,
            function() { kacey.mood += 5; }, // Intrigued by the negotiation
            you
            `Hmm, sounds, like, super risky, Kace. Harrison's got eyes in the back of his bald spot. What's in it for me, besides, like, potential academic ruin?`,

            kacey
            `(A slow, appraising smile spreads across her face. She loves a good negotiation.)`,
            `Okay, I see you. Playing hard to get, are we? I respect that. How about this: if we pull it off, I'll, like, totally do your Trig homework for a week.`,
            `AND I'll let you borrow my new Distressed Denim jacket. The one you've been, like, drooling over.`,

            you
            `A whole week of Trig? And the jacket? Hmm... Make it two weeks of Trig, and you have yourself a deal, Picasso of Pranks.`,

            kacey
            `Two weeks?! Ugh, you're, like, a brutal negotiator. Fine! Two weeks. But this better be, like, flawlessly executed. Now, for Operation Ogre Mouth...`,
            function() { kacey.prankAgreed = true; kacey.mood += 15; }
        )
    ),

    // Aftermath based on kacey.prankAgreed
    IF(() => kacey.prankAgreed,
        text
        `A few minutes later, as Mr. Harrison entered the classroom, your distraction (a surprisingly convincing coughing fit that involved a lot of dramatic gasping) worked like a charm.`,
        `Kacey, smooth as a shadow, darted to his desk, made the switch, and was back in her seat, innocently examining her nails, just as Harrison turned his attention from your "near-death experience."`,
        `The first sip was everything you'd hoped for. A slight frown, a confused glance at his thermos, and then, as the minutes ticked by, an increasingly vibrant green hue staining his lips and teeth.`,
        `The class was a masterpiece of suppressed giggles and wide-eyed stares.`,
        
        // Music shift back or to something triumphant/chill
        REMOVE.AUDIO(`menacing.ogg`, { fade: 1 }),
        ADD.AUDIO(`everyday.mp3`, { volume: 0.4, loop: true, delay: 0.5, seek: 30 }), // Restart 'everyday' or a new track

        text
        `After class, Kacey practically vibrated with glee.`,

        kacey
        `Oh. My. GOD! Did you SEE his face?! He looked like a confused frog! That was, like, pure art! We are, like, actual legends! High five!`,
        `(Kacey mimes a high-five, beaming.)`,

        you
        `Totally! I almost lost it when he tried to ask Sarah about her essay with that, like, full-on Grinch mouth! Best school day ever.`,

        kacey
        `See? This is what happens when you, like, embrace a little chaos! So, what's our next masterpiece? I was thinking we could, like, "accidentally" switch the cheerleaders' routine music with, like, polka?`,

        you
        `(Laughing) You're incorrigible, Kacey. But... polka, you say? Intriguing.`
    ),
    ELSE(
        text
        `Mr. Harrison's class proceeded with its usual, soul-crushing monotony. His coffee remained its boring, beige self.`,
        `Kacey spent the entire period shooting daggers at you with her eyes, occasionally whispering and giggling with Brittany Miller, who, like, usually only talked about her horse.`,
        `You couldn't help but feel a pang of... something. Regret? FOMO? Or maybe just relief that you weren't currently scrubbing green dye off school property.`,
        
        REMOVE.AUDIO(`menacing.ogg`, { fade: 1 }),
        ADD.AUDIO(`everyday.mp3`, { volume: 0.25, loop: true, delay: 0.5, seek: 60 }), // Quieter, more somber 'everyday'

        text
        `After the bell, Kacey swept past you without a word, Brittany trailing in her wake like a newly converted disciple.`,

        kacey
        `(Loud enough for you to hear, to Brittany)`,
        `So, Britt, since some people are, like, allergic to fun, wanna hit the mall after this dump? I heard there's a massive sale at "Spoiled Rotten." We can, like, totally trash-talk everyone who isn't us.`,
        
        you
        `<i>Ouch. Okay, note to self: never underestimate Kacey's capacity for holding a grudge... or her ability to, like, instantly recruit new minions.</i>`,
        `<i>This is gonna be a long day.</i>`
    ),

    // End of Scene
    WAIT(3),
    text
    `The school day was far from over, and with Kacey involved, anything could still happen...`
);

PLAY(scene);