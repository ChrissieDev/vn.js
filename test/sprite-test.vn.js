// This is a test script for the vn.js engine
// It demonstrates the new sprite system for actors

// Define animations for our demo
const fadeIn = ANIMATION(
    [
        { opacity: 0, transform: 'translateX(-30px)' },
        { opacity: 1, transform: 'translateX(0px)' }
    ],
    {
        duration: 800,
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        fill: 'forwards'
    }
);

// Create our scene
const scene = SCENE(
    // Add a background
    ADD.IMAGE('classroomDay'),

    // Add the actor with the new sprite system
    ADD.ACTOR('kacey', {
        style: 'opacity: 1'
    }),
    
    kacey
    `{ <: O <-< } What did you just do..? { >: ( x-< } What the hell is wrong with you!?`,

    kacey
    `The expression changes the moment the text box scrolls to the index that the { ... } expression was at when it was parsed by the text box.`,

    kacey
    `Thanks for checking out this demo!`
);

// Play the scene
PLAY(scene);
