import { Dialog, Portal, Image, createOverlay } from '@chakra-ui/react';

export const postImageDialog = createOverlay((props) => {
  const { photoUrl, ...rest } = props;
  return (
    <Dialog.Root {...rest}>
      <Portal>
        <Dialog.Backdrop bg="blackAlpha.300" />
        <Dialog.Positioner onClick={() => props.onOpenChange?.({ open: false })}>
          <Dialog.Content bg="transparent" shadow="none" maxW="90vw" maxH="90vh">
            <Dialog.Body p={0} display="flex" alignItems="center" justifyContent="center">
              <Image
                src={photoUrl}
                alt="Post photo"
                borderRadius="md"
                maxH="85vh"
                maxW="85vw"
                fit="contain"
                cursor="pointer"
                onClick={() => props.onOpenChange?.({ open: false })}
              />
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
});
