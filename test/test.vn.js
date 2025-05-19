const test = 'fff';

// Example: Running a scene.
START(
    ADD("kacey"),
    ADD("classroom-front-day"),

    FADE_IN("2s"),
    WAIT("500ms"),

    PLAY("everyday", { volume: 0.1 }),

    kacey
    `Lorem ipsum dolor sit amet, consectetur adipiscing elit. In purus enim, hendrerit et lorem et, cursus sodales urna. Phasellus tristique justo in semper facilisis. Interdum et malesuada fames ac ante ipsum primis in faucibus. Praesent ullamcorper auctor nunc. Nullam ac orci tincidunt, venenatis nibh vel, imperdiet metus. In egestas dui ut ligula tristique ullamcorper. Praesent ac enim justo. Praesent eget fermentum elit, vitae suscipit justo.

Aliquam tristique libero eu felis molestie scelerisque. Nulla consectetur urna ut quam lobortis, sit amet accumsan ex convallis. Nunc sit amet nunc et purus commodo elementum ac at ex. Suspendisse potenti. Proin sit amet libero quis sem semper porta. Vivamus vel nibh ipsum. Maecenas nec hendrerit magna, et molestie nunc. In lectus lacus, hendrerit non massa eu, imperdiet pretium sapien. Mauris risus libero, vulputate a lacus et, pulvinar vestibulum ante. Maecenas hendrerit neque a blandit finibus. Ut erat tortor, vehicula id fringilla pulvinar, fringilla sed diam. Morbi sagittis tempor egestas. Morbi sodales libero eu sapien ultricies dignissim non eget nunc. Curabitur nibh augue, semper et dui at, aliquet iaculis libero.`,
    kacey `This class is so lame. I wish I was at home playing <i blue>The Sims 4</i> all fucking day.`,

    Mysterious_Figure `Hello, Kacey.`,

    kacey `O M F GEE! Who are you!? And what are you doing inside my head?`,

    Mysterious_Figure `I am the one who will guide you through this world.`,

    kacey `Guide me? Like, through what? Trig?`,

    Mysterious_Figure `You do not understand. You are in great danger, Kacey.`,

    PAUSE("everyday"),

    kacey `Yeah, I know. I'm totally failing trig.`,

    Mysterious_Figure `No, I mean you are in danger of losing your life.`,

    "Kacey whips her head around, slinging her long, blonde hair over her shoulder. She clicks her tongue and rolls her eyes.",

    PLAY("everyday", { volume: 0.1 }),

    kacey `Actually, you're the one in danger. I have a 4.0 GPA and a 3.8 SAT score. I could get into any college I want. I could even get into Harvard.`,

    Mysterious_Figure `You have to get out of here, Kacey. You have to leave this place.`,

    kacey `Guess what? YOU need to get the hell out of my head! I haven't had my morning starbs yet,
    and I'm not in the mood for your creepy esper bullshit. I have a trig test to study for.`,

    Mysterious_Figure `Kacey... you are not going to pass that test... Please listen to me--------`,

    kacey `Ex-CUSE ME!? Are you fucking kidding me? That's it! I'm blocking your spirit energy right now!
    This morning's horoscope said that <i style="
    color: #fff; /* Color of the text itself */
            background-color: transparent; /* Optional: Dark background to see the glow better */
            padding: 10px; /* Optional: Just for better display */
            font-size: 24px; /* Optional: Make text bigger */
            text-shadow:
                0 0 5px #fff,
                0 0 10px #fff,
                0 0 15px #fff,
                0 0 20px #0ff,
                0 0 30px #0ff,
                0 0 40px #0ff;
    ">my chakras</i> are a-fucking-ligned and I am NOT going to let you make this day any worse!`,

    // function arg gets evaluated at runtime, checked at runtime, ran if truthy
    IF(function() {
        return test === "foo";
    },
        kacey `Foo`,
        kacey `A`,
        kacey `1`,

    ),
    // this is evaluated at parse time since there's no way to at runtime (the original expression is not preserved), checked at runtime and ran if truthy
    ELIF((test === "bar"),
        kacey `Bar`,
        kacey `B`,
        kacey `2`,
    ),
    ELIF(function() {
        return test === "baz";
    }, 
        kacey `Bar`,
        kacey `C`,
        kacey `3`,

    ),
    // runs if any of the above conditions are false, runs if truthy
    ELSE(
        kacey `Qux`,
        kacey `D`,
        kacey `4`,
    ),

        

    FADE_OUT("2s")
);
