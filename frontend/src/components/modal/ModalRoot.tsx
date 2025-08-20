// const modalMap = {
//   writingDetail: WritingDetailModal,
//   mathDetail: MathDetailModal,
// };

// export function ModalRoot() {
//   const { isOpen, modalType, modalData } = useSelector((state) => state.modal);
//   if (!isOpen || !modalType) return null;

//   const ModalComponent = modalMap[modalType];
//   return (
//     <BaseModal onClose={() => dispatch(closeModal())}>
//       <ModalComponent {...modalData} />
//     </BaseModal>
//   );
// }
