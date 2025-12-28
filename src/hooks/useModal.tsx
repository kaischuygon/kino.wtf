import React, { useRef, type ReactNode } from "react";

export default function useModal() {
    const dialogElement = useRef<HTMLDialogElement>(null);

    // Modal as a component so it can be used with JSX: <Modal>...</Modal>
    const Modal: React.FC<{ children?: ReactNode, className?: string }> = ({ children, className }) => (
        <dialog ref={dialogElement} className="modal">
            <div className={[className, "modal-box border border-base-300"].join("\x20")}>
                {children}

                <div className="modal-action">
                    <form method="dialog">
                        <button className="btn btn-secondary shadow">Close</button>
                    </form>
                </div>
            </div>
            <form method="dialog" className="modal-backdrop">
                <button>close</button>
            </form>
        </dialog>
    );

    return {
        Modal,
        open: () => dialogElement.current?.showModal(),
        close: () => dialogElement.current?.close(),
    };
}
