START(
    ADD("kacey"),
    ADD("classroom-front-day"),
    FADE_IN("1s"),

    CHECKPOINT("loop_point"),

    CHOOSE(
        `What do you want to do?`,
        OPTION(`Say hello`,
            kacey `Hey there!`,
            _ `You wave at Kacey.`,
            // Loop back to the checkpoint
            JUMP("loop_point")
        ),
        OPTION(`Stay silent`,
            _ `You decide to stay quiet.`,
            // Loop back to the checkpoint
            JUMP("loop_point")
        ),
        OPTION(`End the loop`,
            kacey `I guess we're done here!`
            // No jump, so the scene will continue and fade out
        )
    ),

    FADE_OUT("2s")
);