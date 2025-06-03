START(
    ADD("drake"),
    ADD ("princess"),
    ADD("classroom-front-day"),
    FADE_IN("1s"),

    drake `I like kids in a really healthy way!`,
    _ `Drake seems to be in bit too much of a good mood today.`,
    WAIT("200ms"),
     `Way too much good of a mood...`,
     princess `I think Drake is a bit too excited about the students here... At least he's not touching them...`,
     
    CHECKPOINT("loop_point"),

    CHOOSE(
        `What do you want to do?`,
        OPTION(`Say hello`,
            drake `I love teaching kids!`,
            _ `You wave at Drake.`,
            // Loop back to the checkpoint
            JUMP("loop_point")
        ),
        OPTION(`Stay silent`,
            _ `You decide to stay quiet.`,
            // Loop back to the checkpoint
            JUMP("loop_point")
        ),
        OPTION(`End the loop`,
            drake `I guess we're done here!`
            // No jump, so the scene will continue and fade out
        )
    ),

    FADE_OUT("2s")
);