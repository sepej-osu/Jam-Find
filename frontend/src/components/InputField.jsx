
import {
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Select,
  FormErrorMessage,
  Text
} from '@chakra-ui/react';

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
              value={value}
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
          <Select name={name} value={value} onChange={onChange} placeholder="Select...">
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
          </Select>
        );

      // handles email, password, text, number, date, etc.
      default:
        return (
          <Input
            type={type}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
          />
        );
    }
  };

  return (
    //Label with required asterisk if field is required
    <FormControl isRequired={required} isInvalid={error} mb={4}>
      <FormLabel>
        {label}
      </FormLabel>

      {/* Render the appropriate input type */}
      {renderInput()}

      {/* Error message - only shows if there's an error */}
      {error && <FormErrorMessage>{error}</FormErrorMessage>}
    </FormControl>
  );
}

export default InputField;


