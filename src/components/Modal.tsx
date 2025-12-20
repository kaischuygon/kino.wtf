import { useRef, type ReactNode } from "react";

interface ModalProps {
    button: ReactNode,
    tooltip?: string,
    children: ReactNode
}

export default function Modal(props:ModalProps) {
    const dialogElement = useRef<HTMLDialogElement>(null);
    const { button, tooltip, children } = props;

    return <>
        <button className="btn btn-ghost btn-circle tooltip" data-tip={tooltip} onClick={() => dialogElement.current?.showModal()}>
            {button}
        </button>
        <dialog id="statsModal" ref={dialogElement} className="modal">
            <div className="modal-box">
                {children}

                <div className="modal-action">
                    <form method="dialog">
                        <button className="btn">Close</button>
                    </form>
                </div>
            </div>
            <form method="dialog" className="modal-backdrop">
                <button>close</button>
            </form>
        </dialog>
    </>

}