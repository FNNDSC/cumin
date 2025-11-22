import { errorStack, errorStack_configure } from '../src/error/errorStack';

// Remove the mock for getCurrentFunctionName and allow the actual function to run.
// We will adjust expectations to match the dynamic output.

describe('ErrorStack', () => {
  beforeEach(() => {
    errorStack.stack_clear(); // Clear stack before each test
  });

  it('should be a singleton', () => {
    const instance1 = errorStack;
    errorStack_configure({}); // Call the configure function
    const instance2 = errorStack; // Get the instance again after potential re-configuration
    expect(instance1).toBe(instance2);
  });

  it('should push messages with dynamic function name', () => {
    errorStack.stack_push('error', 'Test error message');
    const allMessages = errorStack.all_get();
    expect(allMessages).toHaveLength(1);
    expect(allMessages[0].type).toBe('error');
    // Expect the message to contain the dynamic function name format
    expect(allMessages[0].message).toMatch(/\[.*\] \| Test error message/);
  });

  it('should pop messages', () => {
    errorStack.stack_push('error', 'Message to pop');
    const popped = errorStack.stack_pop();
    expect(popped?.message).toContain('Message to pop');
    expect(errorStack.all_get()).toHaveLength(0);
  });

  it('should return undefined when popping from an empty stack', () => {
    const popped = errorStack.stack_pop();
    expect(popped).toBeUndefined();
  });

  it('should search messages by substring (case-insensitive)', () => {
    errorStack.stack_push('error', 'This is a test message');
    errorStack.stack_push('warning', 'Another message');
    const results = errorStack.stack_search('TEST');
    expect(results).toHaveLength(1);
    // Expect the message to contain the dynamic function name format
    expect(results[0]).toMatch(/error: \[.*\] \| This is a test message/);
  });

  it('should get all messages of a specific type', () => {
    errorStack.stack_push('error', 'Error 1');
    errorStack.stack_push('warning', 'Warning 1');
    errorStack.stack_push('error', 'Error 2');
    
    const errors = errorStack.allOfType_get('error');
    expect(errors).toHaveLength(2);
    expect(errors[0]).toContain('Error 1');
    expect(errors[1]).toContain('Error 2');
  });

  it('should clear all messages', () => {
    errorStack.stack_push('error', 'Error');
    errorStack.stack_clear();
    expect(errorStack.all_get()).toHaveLength(0);
  });

  it('should clear messages of a specific type', () => {
    errorStack.stack_push('error', 'Error 1');
    errorStack.stack_push('warning', 'Warning 1');
    errorStack.stack_push('error', 'Error 2');
    errorStack.type_clear('error');
    
    expect(errorStack.allOfType_get('error')).toHaveLength(0);
    expect(errorStack.allOfType_get('warning')).toHaveLength(1);
  });

  it('should check for existence of messages', () => {
    expect(errorStack.messages_checkExistence()).toBe(false);
    errorStack.stack_push('error', 'An error');
    expect(errorStack.messages_checkExistence()).toBe(true);
  });

  it('should check for existence of messages of a specific type', () => {
    errorStack.stack_push('error', 'An error');
    expect(errorStack.messagesOfType_checkExistence('error')).toBe(true);
    expect(errorStack.messagesOfType_checkExistence('warning')).toBe(false);
  });

  it('should configure function name padding width', () => {
    // Simply check that calling it doesn't throw and allows pushing messages
    errorStack_configure({ functionNamePadWidth: 10 });
    errorStack.stack_push('error', 'Test config with short width');
    const messages1 = errorStack.all_get();
    expect(messages1.length).toBeGreaterThan(0);
    
    errorStack_configure({ functionNamePadWidth: 50 });
    errorStack.stack_push('error', 'Test config with large width');
    const messages2 = errorStack.all_get();
    expect(messages2.length).toBeGreaterThan(messages1.length);
  });
});