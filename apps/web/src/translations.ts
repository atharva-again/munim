import type { PreferredLanguage } from "@munim/contracts";
const hindi: Readonly<Record<string, string>> = {
  Overview: "एक नज़र",
  Transactions: "लेन-देन",
  Insights: "हिसाब की समझ",
  "Business Memory": "दुकान की याददाश्त",
  Memory: "याददाश्त",
  Ledger: "बही-खाता",
  Record: "लिखें",
  Settings: "सेटिंग्स",
  "Record Transaction": "लेन-देन लिखें",
  "Main Navigation": "मुख्य पन्ने",
  "Mobile Navigation": "मुख्य पन्ने",
  "Sign Out": "बाहर निकलें",
  "Dark Mode": "गहरा रंग",
  Appearance: "दिखावट",
  "Switch to Light Mode": "हल्का रंग चुनें",
  "Switch to Dark Mode": "गहरा रंग चुनें",
  "Your Business, at a Glance": "आपका हिसाब एक नज़र में",
  "A clear view of the money moving through your business.":
    "कितने पैसे आए, कितने गए और कितने बाकी हैं।",
  "Money Received": "पैसे मिले",
  "Money Paid": "पैसे दिए",
  Outstanding: "बाकी रकम",
  "Settled incoming": "मिल चुके पैसे",
  "Settled outgoing": "दिए जा चुके पैसे",
  "Awaiting settlement": "भुगतान बाकी है",
  "Net Cash Flow": "आए पैसे − दिए पैसे",
  "Received minus paid, across your ledger.":
    "आपके हिसाब में मिले पैसों में से दिए पैसे घटाकर।",
  "To Receive": "लेने हैं",
  "To Collect": "लेने हैं",
  "To Pay": "देने हैं",
  "Recent Transactions": "हाल के लेन-देन",
  "View All": "सभी देखें",
  "Ledger Summary": "हिसाब का सार",
  "No Transactions Yet": "अभी कोई लेन-देन नहीं",
  "Connect Your Ledger": "हिसाब अभी नहीं खुल पाया",
  "Record a sale, expense, payment, or transfer to get started.":
    "बिक्री, खर्च या भुगतान लिखकर शुरू करें।",
  "Your transactions will appear here when connected.":
    "जुड़ने पर आपके लेन-देन यहाँ दिखेंगे।",
  "Ledger offline. Connect your database to view and record transactions.":
    "हिसाब से जुड़ नहीं पाए। थोड़ी देर में फिर कोशिश करें।",
  "Your Books, in Your Words": "आपकी बातों में आपका हिसाब",
  "Speak, type, or fill in a form. Keep your business ledger in one place.":
    "बोलकर, लिखकर या फ़ॉर्म भरकर अपना हिसाब रखें।",
  "Continue with Google": "Google से जुड़ें",
  "Sign-in failed.": "जुड़ नहीं पाए। फिर कोशिश करें।",
  "Google sign-in is awaiting setup. Add the Google credentials and Better Auth configuration to enable access.":
    "Google से जुड़ना अभी उपलब्ध नहीं है। थोड़ी देर में कोशिश करें।",
  "Opening Munim…": "मुनीम खुल रहा है…",
  "Connecting…": "जुड़ रहे हैं…",
  "Loading…": "खुल रहा है…",
  "Loading Content": "जानकारी खुल रही है",
  "Loading Your Preferences…": "आपकी पसंद देख रहे हैं…",
  "Try Again": "फिर कोशिश करें",
  Continue: "आगे बढ़ें",
  Back: "वापस",
  "Finish Setup": "शुरू करें",
  "Saving…": "सेव हो रहा है…",
  "Save Changes": "बदलाव सेव करें",
  "Preferences saved.": "आपकी पसंद सेव हो गई।",
  "How Should Munim Speak?": "अपनी भाषा चुनें",
  "Choose Your Language": "अपनी भाषा चुनें",
  "Preferred Language": "पसंदीदा भाषा",
  "Conversation Language": "भाषा",
  Language: "भाषा",
  Hindi: "हिन्दी",
  English: "अंग्रेज़ी",
  "Choose the language for your greeting and default replies. You can still speak Hindi, English, or both at any time.":
    "मुनीम के पन्ने और जवाब इस भाषा में होंगे। आप हिन्दी, अंग्रेज़ी या दोनों में बोल सकते हैं।",

  "How Should Entries Be Saved?": "हिसाब कैसे लिखना है?",
  "Choose whether Munim asks for approval or saves complete entries for you.":
    "मुनीम हर बार पूछे या पूरी जानकारी मिलने पर अपने आप हिसाब लिख ले।",
  "Ask for Approval": "सेव करने से पहले पूछें",
  "Full Autonomy": "अपने आप सेव करें",
  "Check each entry and confirm before Munim saves it.":
    "पहले हिसाब देखें। आपके हाँ कहने पर ही सेव होगा।",
  "Save complete new voice and text entries immediately, without a review. Ask only when details are missing.":
    "बोलकर या लिखकर पूरी बात बताएँ, हिसाब अपने आप सेव होगा। कुछ जानकारी छूटी तो मुनीम पूछेगा।",
  "Saving Preference": "सेव करने का तरीका",
  "Choose how much Munim handles for you.":
    "चुनें कि सेव करने से पहले मुनीम को पूछना है या नहीं।",
  "You can change your language later in Settings.":
    "सेटिंग्स में भाषा कभी भी बदल सकते हैं।",
  "You can change this later in Settings. The form always waits for you to submit.":
    "यह पसंद सेटिंग्स में बदल सकते हैं। फ़ॉर्म भरने पर सेव का बटन दबाना होगा।",
  "Your greeting and default replies use this language. You can still speak Hindi, English, or both.":
    "सभी पन्ने और जवाब इस भाषा में होंगे। आप हिन्दी, अंग्रेज़ी या दोनों में बोल सकते हैं।",

  "Opening Greeting ·": "शुरुआत में मुनीम कहेगा ·",
  "Reconnect voice to hear the new greeting.":
    "नया अभिवादन सुनने के लिए दोबारा बात शुरू करें।",
  "Applies to your next entry or submission. Changing this setting does not save an existing draft. The form always waits for you to submit.":
    "अगली बार हिसाब लिखने पर यह पसंद लागू होगी। इसे बदलने से अधूरा हिसाब सेव नहीं होगा। फ़ॉर्म भरने पर सेव का बटन दबाना होगा।",
  "Step {step} of 2": "2 में से कदम {step}",
  Voice: "बोलें",
  Text: "लिखें",
  Form: "फ़ॉर्म",
  "Entry Method": "हिसाब लिखने का तरीका",
  "Tell Munim What Happened": "बताएँ क्या लेन-देन हुआ",
  Send: "भेजें",
  "Understanding…": "समझ रहे हैं…",
  "Opening Your Draft…": "हिसाब खोल रहे हैं…",
  "Opening Voice…": "बात शुरू हो रही है…",
  "Review Entry": "हिसाब जाँचें",
  "Save Entry": "हिसाब सेव करें",
  "Confirm & Save": "हाँ, सेव करें",
  "Confirm &amp; Save": "हाँ, सेव करें",
  "Ready for Review": "हिसाब जाँच लें",
  "Check This Entry": "हिसाब सही है?",
  "Transaction Saved": "हिसाब लिख लिया",
  "Transaction saved to the ledger.": "हिसाब सेव हो गया।",
  "New Entry": "अगला लेन-देन",
  "New Conversation": "नई बातचीत",
  "Conversation History": "बातचीत देखें",
  "For credit or part payments, include the customer or supplier.":
    "रकम बाकी है तो ग्राहक या दुकानदार का नाम भी बताएँ।",
  "Ramesh took ₹500 of goods, paid ₹200, and owes ₹300.":
    "रमेश ने ₹500 का सामान लिया, ₹200 दिए और ₹300 बाकी हैं।",
  "You: ": "आप: ",
  "Munim: ": "मुनीम: ",
  Today: "आज",
  "Not specified": "नहीं बताया",
  "Not Specified": "नहीं बताया",
  "Keep speaking to record the next entry.": "अगला लेन-देन बताइए।",
  "Send the next entry above.": "अगला लेन-देन ऊपर लिखकर भेजें।",
  "Working…": "एक पल…",
  "Speak, type, or use the form. Check the details before saving.":
    "बोलकर, लिखकर या फ़ॉर्म भरकर हिसाब बताएँ।",
  "Speak or type. Complete entries save automatically.":
    "पूरी जानकारी मिलने पर हिसाब अपने आप सेव होगा।",
  "Text understanding is awaiting Groq setup. The form is available now.":
    "अभी लिखकर बात करना उपलब्ध नहीं है। फ़ॉर्म इस्तेमाल कर सकते हैं।",
  "Transaction Type": "किस तरह का लेन-देन?",
  "Select Transaction Type": "लेन-देन का प्रकार चुनें",
  "Money Movement": "पैसों का आना-जाना",
  "Select Movement": "पैसे आए या गए?",
  "Money In": "पैसे आए",
  "Money Out": "पैसे गए",
  "Amount (₹)": "रकम (₹)",
  "Amount Paid (₹)": "कितने रुपये दिए? (₹)",
  "Payment Status": "भुगतान हुआ?",
  "Select Status": "भुगतान की स्थिति चुनें",
  "Fully Paid": "पूरा भुगतान हो गया",
  "Still Due": "भुगतान बाकी है",
  "Partly Paid": "कुछ भुगतान हुआ",
  "What Happened?": "क्या लेन-देन हुआ?",
  "Customer or Supplier": "ग्राहक या दुकानदार",
  "Customer or Supplier (Required)": "ग्राहक या दुकानदार का नाम (ज़रूरी)",
  Name: "नाम",
  "Payment Method": "भुगतान कैसे हुआ?",
  "Date and Time": "तारीख और समय",
  Date: "तारीख",
  Type: "प्रकार",
  Payment: "भुगतान",
  Sale: "बिक्री",
  Purchase: "खरीद",
  Expense: "खर्च",
  "Customer Payment": "ग्राहक से पैसे मिले",
  "Supplier Payment": "दुकानदार को पैसे दिए",
  Refund: "पैसे वापस किए",
  Transfer: "खातों के बीच ट्रांसफ़र",
  Other: "अन्य",
  Cash: "नकद",
  Bank: "बैंक",
  Card: "कार्ड",
  "Review your ledger and follow up on open payments.":
    "अपने लेन-देन और बाकी पैसों का हिसाब देखें।",
  "Matching Entries": "मिले हुए लेन-देन",
  Incoming: "आने वाली रकम",
  Outgoing: "जाने वाली रकम",
  "All Entries": "सभी लेन-देन",
  Settled: "भुगतान हो गया",
  "Filter by Settlement Status": "भुगतान के हिसाब से छाँटें",
  "Search Transactions": "लेन-देन ढूँढें",
  "Search transactions…": "लेन-देन ढूँढें…",
  "Clear Search": "खोज हटाएँ",
  "No Matching Transactions": "ऐसा कोई लेन-देन नहीं मिला",
  "Try another search or settlement status.":
    "कुछ और लिखकर या दूसरी स्थिति चुनकर देखें।",
  "0 entries": "कोई लेन-देन नहीं",
  "Previous Page": "पिछला पन्ना",
  "Next Page": "अगला पन्ना",
  "Previous Entries": "पिछले लेन-देन",
  "Next Entries": "अगले लेन-देन",
  Transaction: "लेन-देन",
  Amount: "रकम",
  Status: "स्थिति",
  "Payment Action": "भुगतान का विकल्प",
  "Business transactions and settlement status": "कारोबार के लेन-देन और भुगतान",
  Open: "बाकी",
  "Partially Settled": "कुछ भुगतान हुआ",
  "Payment Links Unavailable": "भुगतान लिंक उपलब्ध नहीं",
  "Open Payment Link for {description}": "{description} का भुगतान लिंक खोलें",
  "Request Payment for {description}": "{description} के भुगतान का अनुरोध करें",
  "Create Test Payment Link": "परीक्षण भुगतान लिंक बनाएँ",
  "Razorpay test link copied to clipboard.": "परीक्षण भुगतान लिंक कॉपी हो गया।",
  "Razorpay test link created. Copy it to share with the customer.":
    "परीक्षण लिंक बन गया। इसे कॉपी करके भेज सकते हैं।",
  "Test Payment Link": "परीक्षण भुगतान लिंक",
  "Open Test Payment Link": "परीक्षण भुगतान लिंक खोलें",
  "Know what came in, what went out, and what still needs attention.":
    "कितने पैसे आए, कितने गए और कहाँ रकम बाकी है।",
  "7 Days": "7 दिन",
  "30 Days": "30 दिन",
  "90 Days": "90 दिन",
  "Money Movement Period": "हिसाब की अवधि",
  "Net Movement": "आए पैसे − दिए पैसे",
  "No payments in the previous period.":
    "पिछली अवधि में कोई भुगतान नहीं लिखा गया।",
  "Unchanged from the previous period.": "पिछली अवधि जितना ही है।",
  "Record Your First Entry": "पहला लेन-देन लिखें",
  "Money movement, outstanding balances, and payment priorities will appear here as you use your ledger.":
    "लेन-देन लिखने पर यहाँ आए-गए पैसे और बाकी रकम दिखेगी।",
  "Outstanding Now": "अभी कितने पैसे बाकी हैं",
  "Outstanding Entries": "बाकी रकम वाले लेन-देन",
  "Across your full ledger. Highest remaining amounts first.":
    "पूरे बही-खाते में से। सबसे बड़ी बाकी रकम पहले है।",
  "Outstanding Money Direction": "लेने और देने वाले पैसे",
  "Nothing to Collect": "कोई रकम लेनी बाकी नहीं",
  "Nothing to Pay": "कोई रकम देनी बाकी नहीं",
  "No Entries in This Age Range": "इतने पुराने लेन-देन में कोई रकम बाकी नहीं",
  "No outstanding entries are recorded in this direction.":
    "इस तरफ़ कोई रकम बाकी नहीं लिखी गई है।",
  "Choose another age range to see more entries.": "दूसरी अवधि चुनकर देखें।",
  "Show All Ages": "सभी पुराने लेन-देन देखें",
  "Name Not Recorded": "नाम नहीं लिखा गया",
  Recorded: "लिखा गया",
  "Original Amount": "कुल रकम",
  "Already Paid": "भुगतान हो चुका",
  "Recorded On": "लिखने की तारीख",
  "Copy Reminder": "याद दिलाने का संदेश कॉपी करें",
  "Copy Details": "जानकारी कॉपी करें",
  "Reminder copied. You can review and share it yourself.":
    "संदेश कॉपी हो गया। जाँचकर खुद भेज सकते हैं।",
  "Payment details copied.": "भुगतान की जानकारी कॉपी हो गई।",
  "Select and copy the text below.": "नीचे का संदेश चुनकर कॉपी करें।",
  "Payment Note to Copy": "कॉपी करने के लिए भुगतान संदेश",
  "Outstanding by Age": "कितने समय से रकम बाकी है",
  Age: "कितना पुराना",
  "Age starts at the entry date. Due dates are not recorded.":
    "लेन-देन की तारीख से समय गिना गया है। भुगतान की आखिरी तारीख नहीं लिखी गई है।",
  "Under 7 Days": "7 दिन से कम",
  "7–29 Days": "7 से 29 दिन",
  "30+ Days": "30 दिन या ज़्यादा",
  "Where Money Went": "पैसे कहाँ दिए",
  "Actual payments in the selected period.": "चुनी अवधि में लिखे गए भुगतान।",
  "No outgoing payments recorded in this period.":
    "इस अवधि में कोई भुगतान नहीं लिखा गया।",
  "Full-ledger calculations · Updated": "पूरे हिसाब से · अपडेट",
  "IST. Money movement reflects recorded payments, not profit or your account balance.":
    "भारतीय समय। यह लिखे गए भुगतानों का हिसाब है, मुनाफ़ा या बैंक की रकम नहीं।",
  " Showing the last successful update.": " पिछली बार की जानकारी दिख रही है।",
  Supplier: "दुकानदार",
  "Your business conventions, ready when you need them.":
    "दुकान की ज़रूरी बातें याद रखें।",
  Connected: "जुड़ा हुआ",
  "Not Connected": "जुड़ा नहीं है",
  "Memory Connection Needed": "याददाश्त अभी उपलब्ध नहीं",
  "Connect your memory service to search and save business conventions.":
    "दुकान की बातें याद रखने की सुविधा अभी उपलब्ध नहीं है।",
  "Memory Actions": "याददाश्त के विकल्प",
  "Search Memory": "याद रखी बातें ढूँढें",
  "Add Convention": "नई बात याद रखें",
  "Find Business Context": "दुकान की बात ढूँढें",
  "Save a Convention": "कोई बात याद रखें",
  "Look up the preferences, terminology, and decisions you have saved.":
    "पहले याद रखी पसंद, शब्द या फैसले ढूँढें।",
  "Keep a preference or correction that Munim can recall in future entries.":
    "ऐसी बात लिखें जो अगले हिसाब में मुनीम को याद रखनी चाहिए।",
  "What Would You Like to Recall?": "क्या याद करना है?",
  "Business Convention": "दुकान की कोई ज़रूरी बात",
  "How do we categorize delivery fuel?":
    "माल पहुँचाने के पेट्रोल का खर्च कैसे लिखते हैं?",
  "When I say ‘gaadi kharcha’, categorize it as delivery expense.":
    "मैं ‘गाड़ी खर्चा’ कहूँ तो उसे माल पहुँचाने का खर्च मानना।",
  "Searching…": "ढूँढ रहे हैं…",
  "Save Convention": "बात याद रखें",
  "Keep preferences here. Balances and transactions belong in your ledger.":
    "यहाँ दुकान की बातें याद रखें। पैसों का हिसाब बही-खाते में रहता है।",
  "Memory Results": "मिली हुई बातें",
  "Clear Memory Results": "मिली बातें हटाएँ",
  "Context Starts Here": "दुकान की बातें यहाँ याद रहेंगी",
  "Search your memory to see relevant context, or add a convention to use next time.":
    "पुरानी बात ढूँढें या अगली बार के लिए कोई नई बात याद रखें।",
  "Finding relevant context…": "मिलती-जुलती बात ढूँढ रहे हैं…",
  "Saving your convention…": "यह बात याद रख रहे हैं…",
  "Unable to Complete Request": "यह काम पूरा नहीं हुआ",
  "Context Retrieved": "बात मिल गई",
  "Convention Saved": "बात याद रख ली",
  "No context returned.": "कोई बात नहीं मिली।",
  "Could not complete that request.": "यह काम पूरा नहीं हुआ। फिर कोशिश करें।",
  "Could not connect voice.": "बात शुरू नहीं हो पाई। फिर कोशिश करें।",
  "Could not create a payment link.": "भुगतान लिंक नहीं बन पाया।",
  "Could not load insights.": "हिसाब की जानकारी नहीं खुल पाई।",
  "Could not load your preferences.": "आपकी पसंद नहीं खुल पाई। फिर कोशिश करें।",
  "Could not reach Munim. Please try again.":
    "मुनीम से जुड़ नहीं पाए। फिर कोशिश करें।",
  "Could not refresh your draft.": "ताज़ा हिसाब नहीं देख पाए। फिर कोशिश करें।",
  "Could not save your preferences.": "आपकी पसंद सेव नहीं हुई। फिर कोशिश करें।",
  "Could not start an entry.": "नया हिसाब शुरू नहीं हो पाया।",
  "Memory is unavailable. Please try again.":
    "याद रखी बातें अभी नहीं खुल पाईं। फिर कोशिश करें।",
  "The API could not be reached.": "मुनीम से जुड़ नहीं पाए। फिर कोशिश करें।",
  Dismiss: "हटाएँ",
  "{from}–{to} of {total}": "{total} में से {from}–{to}",
  "Latest {count} loaded": "हाल के {count} लेन-देन खुले हैं",
  "{count} entries": "{count} लेन-देन",
  "{count} payments": "{count} भुगतान",
  "{amount} more than the previous period.": "पिछली अवधि से {amount} ज़्यादा।",
  "{amount} less than the previous period.": "पिछली अवधि से {amount} कम।",
  "{count} recorded payments, including part payments. Transfers are excluded. Compared with the previous {days} days; today is still in progress.":
    "{count} भुगतान लिखे गए हैं, कुछ भुगतान वाले भी शामिल हैं। खातों के बीच ट्रांसफ़र शामिल नहीं हैं। पिछली {days} दिनों की अवधि से तुलना है; आज का दिन अभी पूरा नहीं हुआ है।",
  "Recorded today": "आज लिखा गया",
  "Recorded {days} days ago": "{days} दिन पहले लिखा गया",
  "{count} payments · {share}% of money paid":
    "{count} भुगतान · दिए पैसों का {share}%",
  "{amount} paid · {due} due": "{amount} दिए · {due} बाकी",
  "Sign in again to continue.": "आगे बढ़ने के लिए दोबारा जुड़ें।",
  "Please wait a moment and try again.": "थोड़ा रुककर फिर कोशिश करें।",
  "Check the latest entry before trying again.":
    "फिर कोशिश करने से पहले ताज़ा हिसाब देख लें।",
  "This conversation ended. Start again to continue.":
    "यह बातचीत खत्म हो गई। दोबारा शुरू करें।",
  "Ready to Talk?": "हिसाब बताएँ?",
  "Start Talking": "बात शुरू करें",
  "Start Again": "दोबारा शुरू करें",
  "Getting Ready…": "तैयार हो रहे हैं…",
  Cancel: "रद्द करें",
  "You Can Speak Now": "अब बोलिए",
  "I’m Listening": "सुन रहा हूँ",
  "One Moment…": "एक पल…",
  "Munim Is Speaking": "मुनीम बोल रहा है",
  "Microphone Paused": "माइक बंद है",
  Resume: "फिर बोलें",
  Pause: "रोकें",
  End: "बंद करें",
  "More Controls": "और विकल्प",
  "Mute Voice": "आवाज़ बंद करें",
  "Unmute Voice": "आवाज़ चालू करें",
  "Conversation Ended": "बातचीत खत्म हुई",
  "Your saved entries are still in your ledger.":
    "सेव किए लेन-देन आपके बही-खाते में हैं।",
  "Couldn’t Connect": "जुड़ नहीं पाए",
  "Munim couldn’t connect. Try again or type your entry.":
    "मुनीम से जुड़ नहीं पाए। दोबारा कोशिश करें या लिखकर बताएँ।",
  "Type Instead": "लिखकर बताएँ",
  "Allow microphone access when your browser asks.":
    "ब्राउज़र पूछे तो माइक इस्तेमाल करने की अनुमति दें।",
  "Your microphone is blocked. Allow it in your browser, then try again.":
    "माइक की अनुमति बंद है। ब्राउज़र में अनुमति देकर फिर कोशिश करें।",
  "Tell me what happened. You can keep talking naturally.":
    "बताइए क्या हुआ। आप आराम से बोलते रह सकते हैं।",
  "You can pause the microphone whenever you need.":
    "ज़रूरत हो तो माइक रोक सकते हैं।",
  "I’m checking the details.": "बात समझ रहा हूँ।",
  "Listen to the reply, or speak to add something.":
    "जवाब सुनें या कुछ जोड़ना हो तो बोलें।",
  "Resume when you’re ready to speak.": "बोलना हो तो माइक फिर चालू करें।",
  "Saves Automatically": "अपने आप सेव होगा",
  "I’ll Ask Before Saving": "सेव करने से पहले पूछूँगा",
  Saved: "लिख लिया",
  "Last Saved": "पिछला लिखा हिसाब",
  Details: "पूरी जानकारी",
  "Edit Details": "जानकारी बदलें",
  "Save It": "हाँ, सेव करें",
  "Or say “yes” to save this entry.": "सेव करने के लिए ‘हाँ’ भी कह सकते हैं।",
  "That didn’t work. Please say it again or type it.":
    "यह बात पूरी नहीं हो पाई। फिर से बोलें या लिखकर बताएँ।",
  "Voice isn’t available right now. You can type or use the form.":
    "अभी बोलकर बात करना उपलब्ध नहीं है। लिखकर या फ़ॉर्म से बताएँ।",
  "That entry is already saved. Tell me the next one.":
    "वह हिसाब लिख लिया है। अगला लेन-देन बताइए।",
  Munim: "मुनीम",
  UPI: "UPI",
  "Voice Conversation": "बोलकर हिसाब लिखें",
  "Talk to Munim": "मुनीम से बात करें",
  "Start once, then talk naturally.": "बात शुरू करें, फिर आराम से बोलते रहें।",
  "Current Conversation": "अभी की बातचीत",
  You: "आप",
  Example: "उदाहरण",
  "Your words will appear here when you pause.":
    "आप रुकेंगे तो आपकी कही बात यहाँ दिखेगी।",
  "Ramesh took ₹500 of milk on credit.": "रमेश ने ₹500 का दूध उधार लिया।",
  "My reply will appear here.": "मुनीम का जवाब यहाँ दिखेगा।",
  "I couldn’t play that reply. You can read it on screen.":
    "जवाब की आवाज़ नहीं चल पाई। स्क्रीन पर पढ़ सकते हैं।",
  "Your browser blocked sound. Enable sound, then try again.":
    "ब्राउज़र ने आवाज़ रोक दी है। आवाज़ चालू करके फिर कोशिश करें।",
  "Enable Sound": "आवाज़ चालू करें",
  "Choose the language for the app and Munim’s replies. You can speak Hindi, English, or both.":
    "मुनीम के पन्ने और जवाब इस भाषा में होंगे। आप हिन्दी, अंग्रेज़ी या दोनों में बोल सकते हैं।",
  "Use this language for the app and Munim’s replies. You can still speak Hindi, English, or both.":
    "सभी पन्ने और जवाब इस भाषा में होंगे। आप हिन्दी, अंग्रेज़ी या दोनों में बोल सकते हैं।",
  "Hello {name}, {amount} remains due for {description} ({date}). Please let me know when you can pay.":
    "नमस्ते {name}, {description} ({date}) के {amount} बाकी हैं। बताइए भुगतान कब कर पाएँगे।",
  "{name}: {amount} still to pay for {description} ({date}).":
    "{name}: {description} ({date}) के {amount} देने बाकी हैं।",
  "Check the entry and try again.": "हिसाब जाँचकर फिर कोशिश करें।",
};
export function translate(
  language: PreferredLanguage,
  message: string,
  values: Record<string, string | number> = {},
): string {
  const text = language === "hi" ? (hindi[message] ?? message) : message;
  return text.replace(/\{(\w+)\}/g, (match, key: string) =>
    String(values[key] ?? match),
  );
}
export function currentLanguage(): PreferredLanguage {
  return document.documentElement.lang === "hi" ? "hi" : "en";
}
export function localizedError(message: string, status?: number): string {
  const language = currentLanguage();
  if (status === 401) return translate(language, "Sign in again to continue.");
  if (status === 429)
    return translate(language, "Please wait a moment and try again.");
  if (status === 409)
    return translate(language, "Check the latest entry before trying again.");
  if (status === 410)
    return translate(
      language,
      "This conversation ended. Start again to continue.",
    );
  if (language === "hi")
    return (
      hindi[message] ??
      (/[^\x00-\x7F]/.test(message) && /[\u0900-\u097f]/.test(message)
        ? message
        : translate(language, "Could not complete that request."))
    );
  if (status && status >= 500)
    return translate(language, "Could not reach Munim. Please try again.");
  if (status && status >= 400)
    return translate(language, "Check the entry and try again.");
  return message;
}
