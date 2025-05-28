START(
    ADD("drake"),
    ADD("classroom-front-day"),
    FADE_IN("1s"),

    CHECKPOINT("loop_point"),

    CHOOSE(
        `What do you want to do?`,
        OPTION(`Say hello`,
            drake `I love touching kids! i mean, I love teaching kids!`,
            `Drake seems to be in a good mood today.`,
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