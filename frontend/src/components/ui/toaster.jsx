import {
  Toaster as ChakraToaster,
  Portal,
  Spinner,
  Stack,
  Toast,
  createToaster,
} from '@chakra-ui/react';

// This page was created automatically by running: npx @chakra-ui/cli snippet add toaster 
// It replaced the previous useToast convention with a new Toaster component.
// Read about it here : https://docs.chakra-ui.com/components/toast/usage#using-the-toaster-component
// We can customize the default options for all toasts here when we create the toaster instance

export const toaster = createToaster({
  placement: 'bottom-middle',
  pauseOnPageIdle: true,
})

export const Toaster = () => {
  return (
    <Portal>
      <ChakraToaster toaster={toaster} insetInline={{ mdDown: '4' }}>
        {(toast) => (
          <Toast.Root width={{ md: 'sm' }}
          bg={toast.status === 'error' ? 'bg.error' : 'bg.success'}
          >
            {toast.type === 'loading' ? (
              <Spinner size='sm' color='blue.solid' />
            ) : (
              <Toast.Indicator />
            )}
            <Stack gap='1' flex='1' maxWidth='100%'>
              {toast.title && <Toast.Title>{toast.title}</Toast.Title>}
              {toast.description && (
                <Toast.Description>{toast.description}</Toast.Description>
              )}
            </Stack>
            {toast.action && (
              <Toast.ActionTrigger>{toast.action.label}</Toast.ActionTrigger>
            )}
            {toast.closable && <Toast.CloseTrigger />}
          </Toast.Root>
        )}
      </ChakraToaster>
    </Portal>
  )
}
