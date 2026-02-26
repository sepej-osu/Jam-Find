
import { Input, Textarea, NativeSelect, Text, Field } from '@chakra-ui/react';

function InputField({ label, name, type, value, onChange, placeholder, error, required, maxLength, selectOptions }) {
  
  // Function to render the appropriate input based on type
  const renderInput = () => {
    switch (type) {
      // for bio or any multi-line text input
      case 'textarea':
        return (
          <>
            <Textarea
              name={name}
              value={String(value)}
              onChange={onChange}
              placeholder={placeholder}
              maxLength={maxLength}
              rows={4}
            />
            {/* Character counter - only shows if maxLength is provided */}
            {maxLength && (
              <Text fontSize="sm" color="gray.600" mt={1}>
                {value.length}/{maxLength} characters
              </Text>
            )}
          </>
        );

      // Dropdown select - uses custom options if provided, otherwise defaults to gender options
      case 'select':
        return (
          <NativeSelect.Root>
            <NativeSelect.Field
              name={name}
              value={String(value)}
              onChange={onChange}
              placeholder="Select...">
              {selectOptions ? (
                selectOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))
              ) : (
                <>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="non-binary">Non-Binary</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </>
              )}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        );

      // handles email, password, text, number, date, etc.
      default:
        return (
          <Input
            type={type}
            name={name}
            value={String(value)}
            onChange={onChange}
            placeholder={placeholder}
          />
        );
    }
  };

  return (
    //Label with required asterisk if field is required
    <Field.Root required={required} invalid={error} mb={4}>
      <Field.Label>
        {label}
      </Field.Label>
      {/* Render the appropriate input type */}
      {renderInput()}
      {/* Error message - only shows if there's an error */}
      {error && <Field.ErrorText>{error}</Field.ErrorText>}
    </Field.Root>
  );
}

export default InputField;


