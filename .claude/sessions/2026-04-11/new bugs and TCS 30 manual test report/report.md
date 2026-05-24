# TCs Test results

1.) TC-1: End Day Button Shows After 7pm - Pass
2.) TC-2: No End Day Button Before 7pm - Pass
3.) TC-3: Cross-Day Locked Banner - Pass
4.) TC-4: Skip Start Day - Pass
5.) TC-5: Skip End Day → NEUTRAL - Pass
6.) TC-6: "Log same item from yesterday" - Fail
    - Fail 1: Giving fake data and then refusing to actually check previous logs (Bug_1.1, Bug_1.2)
    - Fail 2: Explicitly claiming "no access" to yesterday's scores in current context (Bug_1.3)
    - Fail 3: Getting confused and logging for the wrong day (Bug_2.1, Bug_2.2)
7.) TC-7: "Summarise my sleep last week" - Fail (Bug_3)
    - Only did it for two days apparently even when asked for past 7 days. Misses all 13 fields that exist and is not actually giving any summary.
8.) TC-8: Non-historical message no DB fetch delay - Fail
    - No increase in speed. App is still very slow to do anything, including moving from page to page, starting a new chat, and getting any response.
9.) TC-9: First Message Response Starts Immediately - Fail
    - Still slow (as mentioned in TC-8).
10.) TC-10: Agent Switch Works - Partial (Bug_4)
    - It triggers the agent, but displays the default agent ready greeting *alongside* responding to the user's prompt directly in a second message. Doesn't correctly acknowledge the switch smoothly if a message is typed simultaneously.
11.) TC-11: TODAY Badge Shows Correct Date - Pass
12.) TC-12: Future Date — Forward Nav Disabled - Pass
13.) TC-13: Past Date — Forward Nav Enabled - Pass
14.) TC-14: Correlator Label + Layout - Unknown
    - Not fully tested. User did not understand how to execute this test case.
15.) TC-15: "No" Logs False, Not Skip - Partial / Logic Flaw
    - When saying "no" to a query (e.g., "do you have an entry for x field"), it does not skip the entry, but instead literally logs "no" as the value for the field. It applies "no" instead of contextualizing it as a skip. 
16.) TC-16: "Skip" Still Skips - Deferred
17.) R1/R2: Pull-to-refresh blocked in Chat/Journal - Pass
18.) R3/R4: Chat header/input pinning - Fail (Bug_5.1, Bug_5.2, Bug_5.3)
    - SC1 (Bug_5.1): Application error occurs which when refreshed causes this test case to fail.
    - SC2 (Bug_5.2): In the chat session/home page, the input bar is incorrectly placed below the nav bar.
    - SC3 (Bug_5.3): There is no header in the actual chat page.
19.) R5: Dashboard KCAL no duplicate badge - Pass
20.) R6: Start Day buttons visible in NEUTRAL state - Pass
21.) R7: Page navigation speed - Fail
    - V29 was a fail, and V30 is still just as slow.

# More bugs

1.) Routine Regression: Hallucinating steps and cross-user data leakage (CRITICAL URGENT) (Bug_6.1, Bug_6.2, Bug_6.3, Bug_6.4)
    - It's making up a "Step 3" and asking questions about it (Bug_6.1).
    - When confronted, it acknowledged there is no step 3, but still proceeded to make it up and ask questions for it (Bug_6.2).
    - Routine has regressed and is asking for stuff that doesn't exist. It's asking User B for info that's in User A's account.
    - Bug_6.3 shows the user's actual 3 fields for the routine.
    - Bug_6.4 shows it asking for fields not associated with that routine (making stuff up) and asking for fields from a different user's sleep stats.

2.) Formatting/Logic Regression: Treating arrow as decimal point & Incorrect Time-stamping (Bug_7.1, Bug_7.2)
    - It randomly started parsing an upward trend arrow as a decimal point.
    - SC1 (Bug_7.1) shows the Sleep Score is "84" with an upwards arrow and "3" indicating trend.
    - SC2 (Bug_7.2) shows the system incorrectly logging the score as "84.3".
    - Additionally, the random 7:00 PM time-stamping bug has re-emerged on the entry, as seen in SC2.

3.) Concurrency/Vision Bug: Attaching image while bot is typing breaks vision parsing (Bug_8.1, Bug_8.2, Bug_8.3)
    - If a user attaches an image and sends text while the bot is still typing a previous response (e.g., Step 2), the text goes through but the image attachment is cleared/fails to process (Bug_8.1).
    - When the user re-attaches the same image subsequently in the same chat, the bot processes it but hallucinates completely fake data and argues that it extracted it correctly (Bug_8.2).
    - Bug_8.3 shows the actual image provided, which visibly does not match the data the bot hallucinated.
    - Starting a brand new chat session and uploading the image from scratch works perfectly.

4.) Calculation/Context Regression: Lying about daily food totals and hallucinating duplicate logs (Bug_9.1, Bug_9.2)
    - When asked for daily food totals, the chat provides fake/incorrect numbers.
    - SC1 (Bug_9.1) shows the actual real data from the tracker (e.g. 1550 Kcal, 102.4g Protein).
    - SC2 (Bug_9.2) shows the chat giving inflated, fake info (1978 kcal, 150.6g Protein) and incorrectly arguing that it "logged the Protein Juice again" when the tracker does not reflect any such double entry.

5.) UI/Rendering Regression: Missing confirmation card (Bug_10.1)
    - Intermittent issue where the bot claims it has "filled out the card" for the user to confirm, but fails to actually render or display the interactive UI card.
    - When asked "Where is the card?", the bot hallucinates an excuse about providing a block of JSON text and claims "in a real application, that JSON data would be rendered as an interactive card" (Bug_10.1).

6.) Update Logic/Database Error: Incorrect accumulation when updating logged value (Bug_11.1, Bug_11.2)
    - User logged 100 calories, then told the bot to "add another 100 to it".
    - SC1 (Bug_11.1): The chat correctly states it updated the card bringing the total to 200.
    - SC2 (Bug_11.2): The tracker shows it failed to update the existing entry. Instead, it kept the 100 entry and created a brand new entry for 200, resulting in an incorrect daily total of 300.

7.) UI/Rendering Regression: Refresh causes chat input bar and header to break (Bug_12.1, Bug_12.2)
    - After refreshing the page due to a previous issue, the chat input lost its place and the header completely disappeared.
    - SC1 and SC2 show the broken layout.

8.) Context/Logging Regression: Misses provided routine fields and hallucinates they weren't provided (Bug_13.1, Bug_13.2)
    - During a routine conversation, the user provided all 13 pieces of information along with questions.
    - When it came time to log it, the bot missed almost all the info and only logged 2 out of 13 fields.
    - It then hallucinated/lied, claiming the user didn't provide the other 11 fields, forcing the user to provide them again.
    - SC3 and SC4 show the interaction and the bot's false claims.

9.) LLM Intelligence/Intuition Gap vs Native Gemini (Bug_14.1, Bug_14.2, Bug_14.3, Bug_14.4, Bug_14.5)
    - The chat experience is unintuitive and inferior to the native Gemini app handling the exact same data/conversation.
    - SC1 shows how seamlessly the native Gemini app handles the data.
    - SC2 and SC3 show the YAHA app struggling, giving worse responses, and hallucinating completely fake logging times (pretending food/drink was consumed after sleep).
    - SC4 (Bug_14.4) and SC5 (Bug_14.5) further highlight this gap: Gemini naturally processes data and even makes insightful notes (e.g. noticing higher than usual RHR), while YAHA requires more hand-holding.
    - Needs investigation into prompt engineering or the fact that YAHA uses 2.5 vs Gemini using 3.1.
    - **Context Retrieval Failure (Bug_1.3)**: Explicitly stating it cannot access historical data ("yesterday's scores") even when prompted to do so.

10.) State Logic/Timestamp Regression (Bug_15.1): 7:00 PM bug persists in Neutral State logging
    - When logging info in the neutral state, the system is still incorrectly logging the time as 7:00 PM.
    - This was thought to be fixed but the regression persists, possibly tied to the neutral state.

11.) Hardcoded Username / Auth Profile Fallback Issue (Bug_16.1)
    - Another user testing the app is still being called "Armaan" even after setting a username in the settings.
    - The app is failing to use their configured username.
    - Needs to cleanly fall back to their Gmail profile name (if no username is set) and extract associated Gmail data (age, gender, etc.).

12.) UI Layout Issue: Notes field width in Journal and Tracker (Bug_17.1, Bug_17.2)
    - Text in the "Notes" field wraps awkwardly (e.g., taking up 7 vertical lines) while leaving significant empty space on the right side of the card.
    - Needs to expand and take the full width of the card.
    - SC4 shows this occurring on the Journal page, and SC5 shows the same issue on the Tracker page.

13.) LLM Tool Use / Laziness: Requires multiple attempts to trigger web search (Bug_18.1, Bug_18.2)
    - The bot failed to search online for info straight away, taking 3 attempts of prompting before it finally did.
    - SC1 (Bug_18.1) and SC2 (Bug_18.2) show it failing to fetch the info immediately and requiring repeated user requests to trigger the online search.

14.) LLM Tool Use / Hallucination: Falsely claiming inability to check the internet (Bug_19.1, Bug_19.2)
    - The bot explicitly hallucinated that it lacks the capability to check the internet.
    - SC1 (Bug_19.1) and SC2 (Bug_19.2) show the bot "pretending" it cannot perform live web searches for specific brand data, instead of actually utilizing its web search tool.

15.) State Logic / Crash: End Day trigger starts chat and hangs ("Unauthorized") (Bug_20.1)
    - Pressing "End day" sometimes starts the chat but then does nothing or gets stuck.
    - Specifically, pressing it from the dashboard, leaving the app, and coming back caused "End day" to completely stop working, showing an "Unauthorized" banner.
    - The user had to manually input data and skip the end day process to proceed.
    - SC5 (Bug_20.1) shows the broken state with the "Unauthorized" banner and non-functional button.

16.) Logging / Context Regression: Repeated prompting required to correct date and values (Bug_21.1)
    - The bot required 3 prompts to log an item correctly. It initially gave fake information, then logged it for the wrong date, and only finally got it right.
    - SC1 (Bug_21.1) shows the struggle required to get the correct log entry.

17.) Context Regression: Failing to recall previous items in the same chat session (Bug_22.1)
    - The bot fails to recognize or retrieve items/things previously discussed within the exact same chat session.
    - SC2 (Bug_22.1) shows the bot claiming it doesn't see a previously mentioned item.

18.) Calculation / Accumulation Regression: Daily totals arbitrarily broken/incorrect compared to raw data (Bug_23.1, Bug_23.2, Bug_23.3, Bug_23.4, Bug_28.1, Bug_28.2)
    - **MAJOR ISSUE**: The overall daily calculation in the app randomly breaks, creating unreliable totals even when itemized stats are correct.
    - **Protein Discrepancy (Bug_23.3, Bug_23.4)**: The app calculates 111.7g protein while Gemini correctly identifies 121.3g for the same items.
    - SC3 (Bug_23.1) and SC4 (Bug_28.1) show the app displaying incorrect math/totals.
    - SC4 (Bug_23.2) and SC5 (Bug_28.2) show Gemini holding the real/correct info based on the same raw data.

19.) Intelligence / Estimation Regression: Wildly inaccurate macro calculation and lack of conversational intuition vs Native Gemini (Bug_24.1, Bug_24.2, Bug_24.3, Bug_24.4, Bug_27.1, Bug_27.2)
    - The YAHA app incorrectly calculates macros for food items (e.g., 1900 kcal for a pizza) compared to Native Gemini, which correctly estimates 820 kcal.
    - The app lacks the conversational nuance, proactive adjustment suggestions (e.g., weighted pack multipliers), and context-aware data retrieval of Native Gemini.
    - SC1 (Bug_24.1) & SC2 (Bug_24.2) show Gemini's accurate macro estimation and formatting.
    - SC3 (Bug_24.3) & SC4 (Bug_24.4) show the YAHA app generating wildly inaccurate macros (1900 kcal).
    - SC2 (Bug_27.1) and SC3 (Bug_27.2) demonstrate Gemini's superior intuition in handling complex queries (weighted steps math and deep log retrieval).

20.) Formatting & Presentation Failure vs Native Gemini (Macro Breakdown) (Bug_25.1, Bug_25.2, Bug_25.3)
    - The app fails to format the macro breakdown properly, dumping it as a continuous, hard-to-read blob of text with repetitive "Running Total" lines.
    - Gemini natively uses a clean, plaintext code-block format with itemized breakdowns and clear ingredient notes.
    - SC1 (Bug_25.1) shows Gemini's clean, structured formatting.
    - SC2 (Bug_25.2) shows the YAHA app's messy formatting.
    - SC3 (Bug_25.3) provides the source nutrition label for the cheese that the app failed to parse accurately.

21.) UI/UX: App defaults to Dashboard instead of Chat tab on load (Bug_30.1)
    - The app should always default to the "Chat" tab by default when opened, but it currently defaults to the Dashboard.

22.) State / Context Regression: Chat Rituals fail to recognize existing manual logs (Bug_26.1)
    - If a user logs End of Day data manually, the Chat Ritual does not recognize the existing entry and forces the user to provide the information again.
    - SC1 (Bug_26.1) shows the chat ignoring a manual log and re-asking for Steps and Calories.

23.) LLM Logic Regression: Treating "No" as literal content instead of Skip/Null (Bug_29.1, Bug_29.2)
    - **INTUITION GAP**: When the user says "No" to a prompt asking for data (e.g., "Benchmark Day"), the bot logs the string "No" as the value instead of understanding it as a "Skip" or "Nothing to log".
    - SC1 (Bug_29.1) and SC2 (Bug_29.2) show the bot confirming it logged "No" for the Benchmark Day field.
