import type { PreferredLanguage } from "@munim/contracts";
const hindi: Readonly<Record<string, string>> = {
  "Tap the circle to ask about your books or record a transaction.": "हिसाब पूछने या लेन-देन लिखने के लिए गोले को दबाएँ।",
  "Agent": "मुनीम",
  "Ask about your books, or tell me about a transaction.": "अपने हिसाब के बारे में पूछें, या लेन-देन बताएँ।",
  "Ask Munim…": "मुनीम से पूछें…",
  "Dues by Person": "किसका कितना बाकी है",
  "Across all recorded history. Names are grouped as recorded.": "सभी दर्ज हिसाब से। नाम जैसे लिखे हैं, वैसे ही जोड़े गए हैं।",
  "Entries": "एंट्रियाँ",
  "Oldest Entry": "सबसे पुरानी एंट्री",
  "Remaining": "बाकी रकम",
  "No outstanding balances in this direction.": "इस तरफ़ कोई रकम बाकी नहीं है।",
  "Showing {from}–{to} of {total} people": "{total} में से {from}–{to} नाम दिख रहे हैं",
  "Meko accepted this convention. Check the recalled facts below.": "दुकान की यह बात Meko ने स्वीकार कर ली है। नीचे याद की गई बातें देखें।",
  "{count} updates delivered to Meko in the last 7 days. Conversation delivery does not confirm that a fact was extracted.": "पिछले 7 दिनों में Meko को {count} अपडेट मिले। बातचीत पहुँचने का मतलब यह नहीं कि उससे कोई बात याद हो गई है।",

  "See How It Works": "देखें कैसे काम करता है",
  "You Say": "आप कहते हैं",
  "Munim Prepares": "मुनीम हिसाब बनाता है",
  "A Voice-First Khata for Your Shop": "आपकी दुकान का बोलकर चलने वाला खाता",
  "Say What Happened. Know What’s Due.": "बताइए क्या हुआ। जानिए कितना बाकी है।",
  "Tell Munim about a sale, purchase, or payment in Hindi or English. It prepares the entry and keeps track of what’s paid and what’s left.": "बिक्री, खरीद या भुगतान के बारे में मुनीम को हिन्दी या English में बताएँ। वह हिसाब तैयार करता है और भुगतान व बाकी रकम साथ रखता है।",
  "Get Started": "शुरू करें",
  "Speak or type. Choose whether to review before saving.": "बोलकर या लिखकर बताएँ। सेव करने से पहले जाँच करनी है या नहीं, आप चुनें।",
  "Skip to Content": "मुख्य सामग्री पर जाएँ",
  "Munim Home": "मुनीम का मुख्य पन्ना",
  "How It Works": "कैसे काम करता है",
  "Made for Your Shop": "आपकी दुकान के लिए",
  "Questions": "सवाल",
  "Start Your Khata": "अपना खाता शुरू करें",
  "Change Language": "भाषा बदलें",
  "Open Menu": "मेन्यू खोलें",
  "Close Menu": "मेन्यू बंद करें",
  "For the Way Your Shop Works": "जैसे आपकी दुकान चलती है",
  "Keep the Shop Moving.": "दुकान चलती रहे।",
  "Speak a sale, purchase, or payment. Munim keeps the record and what’s still due.": "बिक्री, खरीद या भुगतान बोलकर बताएँ। मुनीम हिसाब और बाकी रकम एक जगह रखता है।",
  "See an Example": "उदाहरण देखें",
  "Hands weighing almonds at a neighbourhood shop counter": "दुकान के काउंटर पर बादाम तौलते हुए हाथ",
  "For the Business You Run Every Day": "आपकी रोज़ की दुकानदारी के लिए",
  "Less Filling Fields. More Getting on with Business.": "हिसाब भरने में कम, दुकान चलाने में ज़्यादा समय।",
  "Tell Munim what happened in your own words. It puts the details together and asks when something is missing.": "अपनी भाषा में बताइए क्या हुआ। मुनीम हिसाब तैयार करता है और ज़रूरी बात छूटी हो तो पूछता है।",
  "Interactive Example": "खुद आज़माकर देखें",
  "Choose an Example": "उदाहरण चुनें",
  "Part Payment": "कुछ भुगतान",
  "Sale on Credit": "उधार बिक्री",
  "Shop Expense": "दुकान का खर्च",
  "Say It Your Way": "अपने तरीके से बताएँ",
  "See the Record": "हिसाब देखें",
  "Record Shown": "हिसाब दिख रहा है",
  "An example only. Nothing is recorded.": "यह सिर्फ़ उदाहरण है। कुछ सेव नहीं होता।",
  "Your Words Become a Clear Entry": "आपकी बात से बनता है साफ़ हिसाब",
  "The amount, the person, and what’s still due.": "कितनी रकम, किसका नाम और कितना बाकी।",
  "Hindi, English, or a Bit of Both": "हिन्दी, English या दोनों मिलाकर",
  "Prefer Typing? There’s Text Too.": "लिखकर बताना है? वह भी कर सकते हैं।",
  "You Choose When Entries Save": "हिसाब कब सेव हो, आप चुनें",
  "Your Shop Has Its Own Language.": "आपकी दुकान के अपने नाम और तरीके हैं।",
  "Customer nicknames. Your usual supplier. What “one big box” means. Teach Munim once, and it can recall the context later.": "ग्राहकों के छोटे नाम। आपका पुराना सप्लायर। ‘बड़ी पेटी’ का मतलब। मुनीम को बताएँ, वह अगली बातचीत में याद कर सकता है।",
  "Shop Memory Example": "दुकान की याददाश्त का उदाहरण",
  "When I say “canteen,” I mean Kavita Stores.": "मैं ‘कैंटीन’ कहूँ तो मतलब कविता स्टोर्स है।",
  "Understood. “Canteen” means Kavita Stores.": "समझ गया। ‘कैंटीन’ का मतलब कविता स्टोर्स है।",
  "See what Munim recalls. Correct it or ask it to forget.": "देखें मुनीम को क्या याद है। सुधारें या भूलने के लिए कहें।",
  "Jars and shelves inside an Indian neighbourhood shop": "मोहल्ले की दुकान में सामान के जार और शेल्फ़",
  "The Sale Is Only Half the Story.": "बिक्री हुई। भुगतान का क्या हुआ?",
  "What came in? What went out? What’s still owed? Keep the answers together instead of in your head.": "कितना आया, कितना गया, कितना बाकी? सब हिसाब एक जगह रखें।",
  "Paid, Part-Paid, or Still Due": "पूरा भुगतान, कुछ भुगतान या उधार",
  "Keep the total, amount paid, and balance together for each entry. Find what you need by name or status.": "हर एंट्री में कुल रकम, भुगतान और बकाया साथ रखें। नाम या भुगतान की स्थिति से ढूँढें।",
  "Your Books. Your Call.": "आपका हिसाब। आपकी मर्ज़ी।",
  "Check every entry before saving, or let complete entries save automatically. Change your preference whenever you need.": "हर एंट्री जाँचकर सेव करें, या पूरी एंट्री अपने-आप सेव होने दें। ज़रूरत हो तो अपनी पसंद बदल दें।",
  "A Few Good Questions.": "कुछ सवालों के जवाब।",
  "Can I Speak Hindi and English?": "क्या हिन्दी और English बोल सकते हैं?",
  "Yes. Speak Hindi, English, or a mix of both. Choose English or Hindi for the app’s menus and records.": "हाँ। हिन्दी, English या दोनों मिलाकर बोलें। ऐप के मेन्यू और हिसाब के लिए हिन्दी या English चुनें।",
  "Will Munim Ask Before Saving?": "क्या मुनीम सेव करने से पहले पूछेगा?",
  "You choose. Ask for Approval lets you check each entry first. Full Autonomy saves complete entries and asks when details are missing.": "आप चुनें। ‘पूछकर सेव करें’ में पहले जाँच सकते हैं। ‘खुद सेव करें’ में पूरी एंट्री सेव होती है और ज़रूरी बात छूटी हो तो पूछी जाती है।",
  "Can I Type Instead?": "क्या लिखकर हिसाब बता सकते हैं?",
  "Absolutely. Switch between Voice and Text in the same conversation. Your current draft comes with you.": "बिल्कुल। उसी बातचीत में बोलने और लिखने के बीच बदल सकते हैं। अधूरा हिसाब साथ रहता है।",
  "Does Speaking About a Payment Move Money?": "क्या भुगतान बोलने से पैसे चले जाते हैं?",
  "No. Munim records the payment you describe. That alone does not transfer money or verify a bank payment.": "नहीं। मुनीम आपके बताए भुगतान को लिखता है। इससे पैसे ट्रांसफ़र नहीं होते और बैंक भुगतान की पुष्टि नहीं होती।",
  "Does Munim Handle GST Filing?": "क्या मुनीम GST रिटर्न भरता है?",
  "Not currently. Munim helps capture transactions and track paid and outstanding amounts. It doesn’t replace tax filing or a full accounting system.": "अभी नहीं। मुनीम लेन-देन लिखने और भुगतान-बकाया रखने में मदद करता है। यह टैक्स भरने या पूरे अकाउंटिंग सिस्टम की जगह नहीं लेता।",
  "Start with One Entry.": "एक हिसाब से शुरू करें।",
  "A sale, an expense, a customer’s payment. Tell Munim what happened.": "कोई बिक्री, खर्च या ग्राहक का भुगतान। मुनीम को बताइए क्या हुआ।",
  "Built for Indian Shopkeepers.": "भारतीय दुकानदारों के लिए।",
  "Speak or type. Keep your business ledger in one place.":
    "बोलकर या लिखकर अपना हिसाब एक जगह रखें।",
  "Tap the circle and tell Munim what happened.":
    "गोले को दबाएँ और मुनीम को लेन-देन बताएँ।",
  "Shop Context": "दुकान की याददाश्त",
  "Past Conversations": "पुरानी बातचीत",
  "Original Name": "मूल नाम",
  "Original Description": "मूल विवरण",
  "All Conversations": "सभी बातचीत",
  "Saved finance conversations. Original words, read-only.": "पैसों से जुड़ी सहेजी हुई बातचीत। मूल शब्दों में, केवल पढ़ने के लिए।",
  "No saved conversations yet.": "अभी कोई बातचीत सहेजी नहीं गई है।",
  "Shop Name": "दुकान का नाम",
  "What’s Your Shop Called?": "आपकी दुकान का नाम क्या है?",
  "Use the name your customers know. You can change it later in Settings.": "वह नाम लिखें जिससे ग्राहक आपकी दुकान को जानते हैं। बाद में सेटिंग्स में बदल सकते हैं।",
  "e.g. Sharma General Store": "जैसे शर्मा जनरल स्टोर",
  "The name shown on your dashboard and in navigation.": "यह नाम डैशबोर्ड और नेविगेशन में दिखेगा।",
  "Step {step} of 3": "चरण {step}, कुल 3",
  "{shop}, at a Glance": "{shop} का हिसाब एक नज़र में",
  "Recent Memories": "हाल की यादें",
  "Saved Memory": "सहेजी गई याद",
  "Show Recent Memories": "हाल की यादें देखें",
  "Loading Memories…": "यादें लोड हो रही हैं…",
  "No memories saved yet. Teach Munim something about your shop to get started.": "अभी कोई याद नहीं सहेजी गई है। शुरुआत के लिए मुनीम को अपनी दुकान के बारे में कुछ बताएँ।",
  "Showing recently recalled shop context. This is not a complete memory search.":
    "हाल में याद की गई दुकान की जानकारी दिख रही है। यह पूरी याददाश्त की खोज नहीं है।",
  "Showing recent shop memories. Older memories may not appear here.":
    "दुकान की हाल की यादें दिख रही हैं। पुरानी बातें यहाँ नहीं भी दिख सकतीं।",
  "Shop memory is still connecting or unavailable. I’ll ask for details when needed.":
    "दुकान की याददाश्त अभी नहीं खुल पाई। ज़रूरी जानकारी पूछ ली जाएगी।",
  "No matching shop context found.": "इस बारे में दुकान की कोई याद नहीं मिली।",
  "Correct Shop Context": "दुकान की जानकारी सुधारें",
  Correct: "सुधारें",
  Forget: "भूल जाएँ",
  "Used in This Reply": "इस जवाब में इस्तेमाल हुआ",
  "Recalled Context": "याद की गई जानकारी",
  "Context updated. Describe any affected unsaved entry again.":
    "जानकारी बदल दी गई है। इससे जुड़ा अधूरा लेन-देन दोबारा बताएँ।",
  "Teach Munim your shop’s names, products, and conventions. It can recall them in later conversations.":
    "मुनीम को अपनी दुकान के नाम, सामान और तौर-तरीके बताएँ। अगली बातचीत में वह इन्हें याद कर सकता है।",
  Ready: "तैयार",
  "What does ‘big crate’ mean in my shop?":
    "मेरी दुकान में ‘बड़ी पेटी’ का क्या मतलब है?",
  "In my shop, ‘big crate’ means 24 bottles.":
    "मेरी दुकान में ‘बड़ी पेटी’ का मतलब 24 बोतलें हैं।",
  "Convention saved. It may take a moment to appear in recall.":
    "बात सेव हो गई। याददाश्त में दिखने में थोड़ा समय लग सकता है।",
  "Shop memory is updating. New conventions may take a moment to appear.":
    "दुकान की याददाश्त अपडेट हो रही है। नई बातें दिखने में थोड़ा समय लग सकता है।",
  "Some shop memory updates could not finish. Your financial records are safe.":
    "दुकान की कुछ बातें याद नहीं हो पाईं। आपका हिसाब सुरक्षित है।",
  "Text entry is unavailable right now. Please try again later.":
    "अभी लिखकर हिसाब जोड़ना उपलब्ध नहीं है। थोड़ी देर में फिर कोशिश करें।",
  "Applies to your next entry. Changing this setting does not save an existing draft.":
    "यह अगले लेन-देन पर लागू होगा। इस पसंद को बदलने से अधूरा हिसाब सेव नहीं होगा।",
  "You can change this later in Settings.":
    "सेटिंग्स में यह पसंद बाद में बदल सकते हैं।",
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
  "Last 30 Days": "पिछले 30 दिन",
  "{amount} more received than in the previous 30 days.":
    "पिछले 30 दिनों से {amount} ज़्यादा पैसे मिले।",
  "{amount} less received than in the previous 30 days.":
    "पिछले 30 दिनों से {amount} कम पैसे मिले।",
  "Received the same as in the previous 30 days.":
    "पिछले 30 दिनों जितने ही पैसे मिले।",
  "No payments recorded in the last 30 days.":
    "पिछले 30 दिनों में कोई भुगतान दर्ज नहीं हुआ।",
  "Record an entry to see payment activity.":
    "भुगतान का हिसाब देखने के लिए लेन-देन लिखें।",
  "Insights could not load.": "हिसाब की जानकारी नहीं खुल पाई।",
  "Payment activity is unavailable right now.":
    "भुगतान की जानकारी अभी उपलब्ध नहीं है।",
  "Memory could not load.": "दुकान की याददाश्त नहीं खुल पाई।",
  "Recent Memory": "हाल की याद",
  Previous: "पिछला",
  Next: "अगला",
  "Overview Details": "हिसाब की अतिरिक्त जानकारी",
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
  "Business transactions and settlement status": "कारोबार के लेन-देन और भुगतान",
  Open: "बाकी",
  "Partially Settled": "कुछ भुगतान हुआ",
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
  "Conversation": "बातचीत",
  "Message Munim": "मुनीम को संदेश लिखें",
  "What would you like to record?": "क्या हिसाब लिखना है?",
  "Tell Munim what happened…": "मुनीम को बताइए क्या हुआ…",
  "Type your reply…": "अपना जवाब लिखें…",
  "Press Mic to Start": "शुरू करने के लिए माइक दबाएँ",
  "Start Again": "दोबारा शुरू करें",
  "Getting Ready…": "तैयार हो रहे हैं…",
  "Munim couldn’t reconnect. Try again or type your entry.":
    "मुनीम फिर से जुड़ नहीं पाया। दोबारा कोशिश करें या लिखकर बताएँ।",
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
    return translate(language, "Could not complete that request.");
  if (status && status >= 400)
    return translate(language, "Check the entry and try again.");
  return message;
}
