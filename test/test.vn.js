/**
 * @file test.vn.js
 * This is a test script/an informal specification to follow when implementing the scripting system in the VNPlayerElement.
 * We'll build onto this as we continue to implement the engine.
 */

this.currentWeapon = null;
let currentWeapon = this.currentWeapon;

let foo = 'bar';

const testScene = SCENE(
    // actor and background image doesn't fit the example dialogue but whatever i'm just testing lol
    ADD.ACTOR(`kacey`),
    ADD.IMAGE(`park-at-night`),
    ADD.AUDIO(`menacing`, { loop : true }),

    START,

    TEXT
    `You open the door to your classroom. 
    It is empty, except for a large pillar in the middle of the room; you've discovered the source of the ticking--it's a large grandfather clock.`,
    `Suddenly, a figure emerges from behind the clock.`,
    
    kacey
    `What was that stunt you pulled yesterday?`,
    `You really thought you could ignore me yesterday when I said hi to you after gym?`,
    
    TEXT
    `Kacey leans against the side of the clock, arms crossed. She's not happy with you.`,

    you
    `Haha, what?`,
    
    TEXT
    `She immediately starts pacing angrily towards you with her arms still crossed--her Dora the Explorer sneakers thumping hard against the floor. Something is wrong.`,

    you
    `You better not come any closer!`,

    kacey
    `Soon, you'll be just another victim of my STAND, <span class="stand">Three Days Grace</span>!`,

    TEXT
    `A humanoid figure with metallic skin, large spiked shoulderpads and rods portruding upwards from the sides of its head like a crown appears behind Kacey.`, 
    
    IF(foo === 'bar',
        TEXT
        `<p style="color: lime;">Triggered IF(...) statement!</p>`,
    ),
    ELSE(
        TEXT
        `<p style="color: red;">Triggered ELSE(...) statement!</p>`,
    ),

    // Testing inline function call
    $(() => {
        alert('A JavaScript function was called as a scene command!');
    }),

    /* Does not work yet */
    PICK(
        'I need to do something!',
        CHOICE(`(Deception) What are you talking about?`,
            you
            `What the hell are you talking about?`,

            kacey
            `That's okay--you'll find out soon enough!`,

            TEXT
            `You approach Kacey. She smirks at you with absolute, unwavering confidence!`,
            `She, too, begins walking towards you.`,
            `Your footsteps, her footsteps, the clock's ticking--you let go of your gym bag, letting it fall to the floor...`,
            
            you,
            `<span class="stand">Shootyz Groove</span>!!`,
            
            TEXT
            `Your stand, which you have had ever since you can remember shimmers into existence in front of you. She's within the effective range of your <span class="stand">Shootyz Groove</span>. You attack immediately, throwing its fist into Kacey's face faster than she could react, crushing her skull completely!`,
            `...or so you thought. Somehow, she managed to guard against your attack!`,
            `Kacey raises her head above her guard, revealing an expression of utter disbelief--her eyes wide open and her mouth slightly open.`,
            `She finally snaps out of it,`,

            $(() => {

            }),

            kacey
            `Did you really think a pathetic strategy like that would work against me?`,
            `You sh't-eating worm!!`,

        ),
        CHOICE(`(Resolve) Did she just say <span class="stand">STAND</span>!?`,
            you
            `Did you just say <span class="stand">STAND</span>?`,
        ),
    ),

    TEXT
    `After this textbox, the script will wait for 5 seconds before continuing.`,

    // Testing wait command
    // wait`5s`,

    

    // RETURN("This value is returned to the caller of RUN(...) or PLAY(...)"),
)

// Testing to see what value SCENE(...) returns
console.log(testScene);

// running the script
/** @todo make this asynchronous so a scene can return something when they're done */
play(testScene);