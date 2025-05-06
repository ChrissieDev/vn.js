const oldWarn = console.warn;

// Defining a reusable animation that can be used with actors' animate() method
// Is a wrapper around the Web Animations API, except the third (optional) argument is a callback function to execute when the animation is finished.
const fadeIn = ANIMATION(
    [
        { opacity: 0, transform: 'translateX(-30px)' }, // Start slightly off-screen and transparent
        { opacity: 1, transform: 'translateX(0px)' }    // Fade in and slide into place
    ],
    {
        duration: 800,
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', // easeOutQuad
        fill: 'forwards'
    },
    () => {
        // Animation finished callback
        console.warn("Animation finished!");
    }
);

const fadeOut = ANIMATION(
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

const scene = SCENE(
    
    // add a <vn-actor> to scene by referencing its `uid` defined in the loaded project
    ADD.ACTOR(`kacey`, {
        style: `transform: translate(0px, 0px) scale(1);`,
    }),

    // executing arbitrary javascript code. the function is executed at runtime when the command is reached.
    function() {
        // initialize some variables for kacey
        kacey.rep = {
            you: 100,
            sato: 0,
            akira: 20,
            takazawa: 0,
        }
        kacey.mood = 50;
    },

    // adding an <img> element from the project to the scene. 
    ADD.IMAGE(`classroom-day`),

    // waiting for 4 seconds before executing the next command
    WAIT(4),

    // playing music defined in the project using its `uid`, just like any other asset. 
    // the second argument are options to override the default values of the imported audio element
    ADD.AUDIO(`everyday`, {
        volume: 0.4,
        loop: true,
    }),
    
    // actor dialogue using a string tag function that is automatically defined in the script context if the actor is added to the scene. 
    // consecutive strings are also dialogue entries of their own, and use the same actor as the previous one.
    kacey
    `This class is so lame.`,
    `I wish I could just go home and play The Sims 4 all day.`,
    `Don't you think so, Harumi-kun?`,

    // 'you' is an invisible actor that exists in every scene by default
    you
    `Well,`,
    
    // creates a multiple choice dialog box, its arguments taking either a CHOICE function or a string, in any order.
    // if only strings are passed, the scene will soft-lock due to there being no choices to continue the scene.
    PICK(
        `Kacey is looking at you.`,

        // CHOICE adds a button to the textbox. The first argument is the button text, and any remaining number of arguments are the commands to execute when the user chooses this option.
        CHOICE(`You've got enough tardies!`,
            text,
            `You laugh at Kacey's comment.`,
            
            you
            `You lazy bum! You can't just skip class! You already have like, 5 tardies this week!`,

            // conditional branching. The first argument is a function that returns a boolean value. If it returns true, the if-statement is executed.
            IF(() => {
                const getsAngry = (kacey.rep.you + kacey.mood) < 50;
                return getsAngry;
            },
                kacey
                `God, you're such a loser!`,
                `You know, like, I don't even care about this class!`,
                `I'm out of here!`,

                kacey.animate(fadeOut, { wait: true }),

                text
                `Kacey storms out of the classroom, slamming the door behind her.`,

                you
                `<i>Someone hasn't had their morning frappé.</i>`,
            ),
            // if the if-statement condition returns a falsy value, an else-statement is executed (if it exists).
            ELSE(
                text
                `Kacey throws her head back and laughs.`,
                
                kacey
                `Haha, I know~! But like, I can't help it!`,
                
                you
                `Actually, you know what? Let's just skip class!`,
                `There's gonna be a trig pop quiz anyway.`, 

                kacey
                `Hold on, I'm gonna go put some thumb tacks on that bastard Sato-sensei's chair first!`,

                you
                `You're so bad!`,

                kacey.animate(fadeOut, { wait: true }),

                text
                `Kacey runs out of the room, <i>presumably</i>, you think, to the utility closet in the hallway to grab some thumb tacks.`,
                `This bitch has definitely had an extra large <i style="color: lightbrown; text-shadow: 2px 2px rgba(0, 0, 0, 0.3);">Starburst Frappuccino aulait</i> from Starbucks this morning.`,
                `You think back to yesterday---how you spent the entire day at the mall with Kacey---how she had at least $55 left when you went home.`,
                `<i>It'd be funny to like, impress her with my deductive reasoning skills.</i> you think, knowing that she should have 35 left after the frappé.`,

                kacey.animate(fadeIn, { wait: true }),

                kacey
                `Oh my god, hold on--`,

                kacey.animate(fadeOut, { wait: true }),

                text
                `You watch Kacey approach the teacher's desk, practically bouncing on her toes. 
                She hunches down and does something to the teacher's chair that you can't quite see from your desk,
                but you know exactly what it is.`,

                kacey.animate(fadeIn, { wait: true }),

                kacey
                `Alright, let's get the fuck out of here.`
            )
        ),
        CHOICE(`I knooow, right?`,
            you
            `I knooow, right? It's so boring! We already know all this stuff!`,

            kacey
            `By the way, I spotted Sato-sensei at an anonymous gay truck stop last night!`,

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
            ),
            
            CHOICE(`...`,
                you,
                `(<i>... Why is she talking to me? She bullies me like every day.</i>)`
                
            )
        )
)

// make the player run the scene
PLAY(scene);