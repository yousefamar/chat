'use client';

import { useEffect, useRef } from "react";
import { FaQuestion } from "react-icons/fa";

// props passed from outside
export default function InfoButton(props: React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>) {
  props.className = (props.className || '') + ' btn';

  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    //<script async data-uid="50a6261ec3" src="https://crafty-innovator-9499.ck.page/50a6261ec3/index.js"></script>

    const script = document.createElement('script');

    script.src = "https://crafty-innovator-9499.ck.page/50a6261ec3/index.js";
    script.async = true;
    script.setAttribute('data-uid', '50a6261ec3');

    const form = document.getElementById('subscribe-form');
    form?.appendChild(script);

    return () => {
      form?.removeChild(script);
    }
  }, []);

  return (<>
    <button {...props} onClick={() => dialogRef.current?.showModal()}>
      <FaQuestion />
    </button>
    <dialog ref={dialogRef} className="modal">
      <div className="modal-box prose">
        <form method="dialog">
          <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
        </form>
        <h2 className="mt-0">About</h2>

        <h3>How does this work?</h3>
        <p><a href="https://islamqa.info/en" target="_blank">IslamQA </a> is an excellent resource but sometimes difficult to search and use. So we use AI to better search through IslamQA answers and then prime GPT-4-turbo to answer questions based on these results. With additional prompt engineering, this allows us to both surface IslamQA answers better, as well as prevent the AI from hallucinating innacurate answers. We are not affiliated with IslamQA.</p>

        <h3>Privacy note</h3>
        <p>IslamChat does not track you or collect any personal data. We do not currently store the questions or answers, but may do so in the future anonymously for the purpose of improving the model. OpenAI does not use this data for training their models at all. If you sign up to the mailing list, then <a href="https://convertkit.com/" target="_blank">ConvertKit</a> stores your email address. Your email address will never be shared with third parties and has no connection to questions you ask.</p>

        <h3>Who are you?</h3>
        <p>IslamChat was conceived and developed by <a href="http://rafje.nl/" target="_blank">Rafih</a> and <a href="https://yousefamar.com" target="_blank">Yousef</a> as an evolution of <a href="https://deen.ai">deen.ai</a>. Our mission is to leverage tech to empower all Muslims. Feel free to email us at any time through <a href="mailto:salam@deen.ai?subject=Salam!&body=Salam%20Yousef%2C%0D%0A%0D%0A" target="_blank">salam@deen.ai</a>. If you are interested in the intersection between Islam and AI, join our WhatsApp group with many likeminded Muslims, and stay up to date on similar projects through our mailing list:</p>

        <div id="subscribe-form" />
      </div>
    </dialog>
  </>);
};