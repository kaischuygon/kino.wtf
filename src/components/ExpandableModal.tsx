import React from "react";
import useModal from "../hooks/useModal";

interface Props {
    children: React.ReactElement<{ onClick?: unknown, className?: string, disabled?: boolean }, string>;
    disabled?: boolean;
}

export default function ExpandableModal({children, disabled=false}: Props) {
    const {Modal: ExpandedModal, open: openExpandedModal } = useModal();

    return <>
        <ExpandedModal>
            {children}
        </ExpandedModal>

        {React.isValidElement(children) ? React.cloneElement(children, {
            onClick: () => disabled ? null : openExpandedModal(),
            className: [children.props?.className, disabled ? "cursor-not-allowed" : "cursor-pointer"].filter(Boolean).join(" "),
        }) : (
            {children}
        )}
    </>
}
