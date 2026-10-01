import type { BlockOf } from "../types"

/** An FAQ with four questions, every field filled. */
export const faqSample: BlockOf<"faq"> = {
  blockType: "faq",
  heading: "Questions our guests often ask",
  questions: [
    {
      question: "What time is check-in?",
      answer: "Check-in is from 4pm and check-out is by 10am.",
    },
    {
      question: "Can I bring a pet?",
      answer:
        "Some homes welcome pets. Look for the pet-friendly label on the home.",
    },
    {
      question: "Is there a cleaning fee?",
      answer:
        "Yes. A one-time cleaning fee is shown in the price before you book.",
    },
    {
      question: "How do I change or cancel a booking?",
      answer: "Contact our team and we will help you, free of charge.",
    },
  ],
  background: "default",
}
