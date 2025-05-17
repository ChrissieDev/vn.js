// Example: Running a scene.
START(
    ADD('kacey'),
    ADD('classroom-front-day'),
    
    FADE_IN("2s"),
    WAIT('500ms'),

    PLAY("everyday", { volume: 0.1 }),
    
    kacey 
    `This class is so lame. I wish I was at home playing <i blue>The Sims 4</i> all fucking day.`,

    Mysterious_Figure
    `Hello, Kacey.`,

    kacey
    `O M F GEE! Who are you!? And what are you doing inside my head?`,

    Mysterious_Figure
    `I am the one who will guide you through this world.`,

    kacey
    `Guide me? Like, through what? Trig?`,

    Mysterious_Figure
    `You do not understand. You are in great danger, Kacey.`,

    kacey
    `Yeah, I know. I'm totally failing trig.`,

    Mysterious_Figure
    `No, I mean you are in danger of losing your life.`,

    "Kacey whips her head around, slinging her long, blonde hair over her shoulder. She clicks her tongue and rolls her eyes.",

    kacey
    `Actually, you're the one in danger. I have a 4.0 GPA and a 3.8 SAT score. I could get into any college I want. I could even get into Harvard.`,

    Mysterious_Figure
    `You have to get out of here, Kacey. You have to leave this place.`,

    kacey
    `Guess what? YOU need to get the hell out of my head! I haven't had my morning starbs yet,
    and I'm not in the mood for your creepy esper bullshit. I have a trig test to study for.`,

    Mysterious_Figure
    `Kacey... you are not going to pass that test... Please listen to me-`,

    kacey
    `Ex-CUSE ME!? Are you fucking kidding me? That's it! I'm blocking your spirit energy right now!
    This morning's horoscope said that <i glow>my chakras</i> are a-fucking-ligned and I am NOT going to let you make this day any worse!`,
    
    FADE_OUT("2s"),
)