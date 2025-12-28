import React from "react";
import useModal from "../hooks/useModal";

interface Props {
    children: React.ReactElement<{ onClick?: unknown, className?: string, disabled?: boolean }, string>;
    disabled?: boolean;
}

export default function ExpandableModal({children, disabled=false}: Props) {
    const {Modal: ExpandedModal, open: openExpandedModal } = useModal();

    return <>
        <ExpandedModal className="max-h-[95vh]">
            {children}
        </ExpandedModal>

        {React.isValidElement(children) ? React.cloneElement(children, {
            onClick: () => disabled ? null : openExpandedModal(),
            className: [children.props?.className, disabled ? "!cursor-not-allowed btn-soft" : "cursor-pointer", "btn shadow h-full m-0 p-0"].filter(Boolean).join("\x20"),
        }) : (
            {children}
        )}
    </>
}
