
import {
  VStack,
  HStack,
  Text,
  Icon,
  Field
} from '@chakra-ui/react';
import { useState } from 'react';
import { LuCheck} from 'react-icons/lu';

import { PasswordInput } from './ui/password-input';

function PasswordField({ label, name, value, onChange, required }) {
  // State to toggle password visibility
  const [visible, setVisible] = useState(false);

  // Validation checks - returns true if requirement is met
  const hasMinLength = value.length >= 8;
  const hasMaxLength = value.length <= 32;
  const hasUppercase = /[A-Z]/.test(value);
  const hasLowercase = /[a-z]/.test(value);
  const hasNumber = /[0-9]/.test(value);

  // All requirements met
  const isValid = hasMinLength && hasMaxLength && hasUppercase && hasLowercase && hasNumber;

  // Component for each requirement line
  const RequirementItem = ({ met, text }) => (
    <HStack gap={2}>
      <Icon color={met ? 'green.500' : 'red.500'} boxSize={4} asChild><LuCheck /></Icon>
      <Text fontSize="sm" color={met ? 'green.600' : 'red.600'}>
        {text}
      </Text>
    </HStack>
  );

  return (
    <Field.Root required={required} mb={4}>
      {/* Label */}
      <Field.Label>
        {label} {required && <span style={{ color: 'red' }}>*</span>}
      </Field.Label>

        <PasswordInput
          name={name}
          value={value}
          onChange={onChange}
          placeholder="Enter password"
          visible={visible}
          onVisibleChange={() => setVisible(visible => !visible)}

        />
      {/* Password requirements list - only show if user has started typing */}
      {value && (
        <VStack align="start" mt={3} gap={1} p={3} bg="gray.50" borderRadius="md">
          <Text fontSize="sm" fontWeight="bold" mb={1}>
            Password Requirements:
          </Text>
          <RequirementItem met={hasMinLength} text="At least 8 characters" />
          <RequirementItem met={hasMaxLength} text="Maximum 32 characters" />
          <RequirementItem met={hasUppercase} text="Contains uppercase letter" />
          <RequirementItem met={hasLowercase} text="Contains lowercase letter" />
          <RequirementItem met={hasNumber} text="Contains number" />
        </VStack>
      )}
    </Field.Root>
  );
}

export default PasswordField;
