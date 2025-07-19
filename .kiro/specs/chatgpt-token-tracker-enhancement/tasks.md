# Implementation Plan

- [ ] 1. Migrate to DOM extraction for conversation data
  - [ ] 1.1 Create DOM parsing utilities for ChatGPT conversations
    - Create parseChatGPTFromDOM function to extract conversation data from DOM
    - Implement conversation ID extraction from URL
    - Add message extraction logic for user and assistant messages
    - Create helper functions for content extraction and formatting
    - Write unit tests for DOM parsing with mock DOM structures
    - _Requirements: 1.1, 1.2, 5.3_

  - [ ] 1.2 Implement DOM mutation observer for real-time updates
    - Create initializeDOMMonitor function with MutationObserver
    - Add detection for new conversation turns and messages
    - Implement debounced extraction to prevent excessive processing
    - Add URL change detection for SPA navigation
    - Write unit tests for observer functionality and debouncing
    - _Requirements: 1.1, 1.2, 6.1, 6.4_

  - [ ] 1.3 Update content script to use DOM-based extraction
    - Remove existing fetch interception code
    - Integrate DOM parsing and monitoring functions
    - Update data processing to use DOM-extracted conversation data
    - Add manual sync button for testing and user control
    - Write integration tests for complete DOM extraction workflow
    - _Requirements: 1.2, 1.3, 6.4_

- [x] 2. Set up core interfaces and dependency injection foundation
  - Create TypeScript interfaces for all core services (IStorageAdapter, ITokenService, ISessionService, ISyncService, IUIService, IApiService)
  - Implement a simple dependency injection container for managing service instances
  - Create base error types and error handling utilities
  - _Requirements: 1.1, 1.2, 4.1, 4.2_

- [x] 3. Refactor existing token usage functionality into modular services
  - [x] 3.1 Create TokenService from existing token counting logic
    - Extract token counting logic from tokenUsage.ts into a dedicated TokenService class
    - Implement ITokenService interface with countTokens and calculateUsage methods
    - Add comprehensive error handling for token counting failures
    - Write unit tests for TokenService functionality
    - _Requirements: 1.1, 1.4, 6.4_

  - [x] 3.2 Create SessionService from existing session management
    - Extract session management logic into SessionService class implementing ISessionService
    - Handle session ID extraction, loading, and switching functionality
    - Integrate with storage adapter interface for data persistence
    - Write unit tests for session management operations
    - _Requirements: 1.1, 1.4, 2.3_

  - [x] 3.3 Create LocalStorageAdapter from existing Chrome storage code
    - Implement IStorageAdapter interface using existing Chrome storage logic
    - Maintain backward compatibility with current data structure
    - Add proper error handling for storage operations
    - Write unit tests for storage adapter functionality
    - _Requirements: 1.1, 1.5, 6.1, 6.4_

- [ ] 4. Create DOMService for conversation data extraction
  - Create DOMService class implementing IDOMService interface
  - Add methods for parsing conversation data from ChatGPT DOM
  - Implement conversation ID and message extraction logic
  - Add content formatting and cleaning utilities
  - Write unit tests for DOM parsing and content extraction
  - _Requirements: 1.1, 1.4, 2.2, 2.5_

- [ ] 5. Create modular UI components and services
  - [ ] 5.1 Implement UIService and Widget component
    - Create UIService class implementing IUIService interface
    - Build Widget component that displays token usage at bottom of ChatGPT interface
    - Implement widget update methods with debounced rendering
    - Add responsive design that doesn't interfere with ChatGPT UI
    - Write unit tests for UI component rendering and updates
    - _Requirements: 2.1, 2.2, 2.4, 5.3_

  - [ ] 5.2 Create sync toggle component for extension popup
    - Build React component for sync toggle in extension popup
    - Implement clear on/off state indication with visual feedback
    - Add sync status display (syncing, synced, error states)
    - Connect toggle to sync service through proper event handling
    - Write unit tests for toggle component interactions
    - _Requirements: 3.1, 3.2, 6.2_

- [ ] 6. Implement configuration management system
  - Create ConfigManager class implementing IConfigManager interface
  - Add methods for managing sync settings and Supabase configuration
  - Implement configuration validation with proper error messages
  - Store configuration in Chrome extension storage with encryption for sensitive data
  - Write unit tests for configuration management and validation
  - _Requirements: 4.1, 4.2, 5.1, 5.2_

- [ ] 7. Build Supabase integration and sync functionality
  - [ ] 7.1 Create SupabaseStorageAdapter
    - Implement IStorageAdapter interface using Supabase client
    - Add authentication handling and connection management
    - Implement offline support with local caching mechanisms
    - Add proper error handling for network and authentication failures
    - Write unit tests with mocked Supabase client
    - _Requirements: 3.3, 3.5, 5.1, 6.1_

  - [ ] 7.2 Implement SyncService with real-time capabilities
    - Create SyncService class implementing ISyncService interface
    - Add methods for enabling/disabling sync with proper state management
    - Implement real-time synchronization with conflict resolution
    - Add retry logic for failed sync operations with exponential backoff
    - Write unit tests for sync operations and error scenarios
    - _Requirements: 3.2, 3.4, 3.6, 6.1, 6.2_

- [ ] 8. Enhance DOM observation and token tracking
  - [ ] 8.1 Refactor observer logic into modular components
    - Extract DOM observation logic from observer.ts into separate observer classes
    - Create MessageObserver for tracking new messages and responses
    - Create PlanObserver for detecting user plan changes
    - Implement proper cleanup and memory management for observers
    - Write unit tests for observer functionality with DOM mocking
    - _Requirements: 1.1, 1.4, 2.2, 5.3_

  - [ ] 8.2 Integrate enhanced token tracking with new services
    - Connect observers to TokenService and SessionService through dependency injection
    - Implement real-time token counting updates with debounced UI updates
    - Add proper error handling for DOM parsing failures
    - Ensure token counting accuracy across different ChatGPT interface changes
    - Write integration tests for complete token tracking workflow
    - _Requirements: 2.2, 2.4, 2.5, 6.4_

- [ ] 9. Update content script and tracker initialization
  - Refactor content.ts to use new dependency injection container
  - Update tracker initialization to instantiate services through DI container
  - Implement proper service lifecycle management and cleanup
  - Add error boundary handling for service initialization failures
  - Write integration tests for extension loading and initialization
  - _Requirements: 1.1, 1.3, 6.4_

- [ ] 10. Add comprehensive error handling and user feedback
  - [ ] 10.1 Implement error notification system
    - Create error notification UI components for different error types
    - Add user-friendly error messages without technical jargon
    - Implement error recovery suggestions and retry mechanisms
    - Add proper logging for debugging while respecting user privacy
    - Write unit tests for error handling and notification display
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ] 10.2 Add sync status indicators and feedback
    - Implement visual sync status indicators in widget and popup
    - Add progress indicators for sync operations
    - Create user notifications for sync success, failure, and recovery
    - Implement graceful degradation when sync is unavailable
    - Write unit tests for status indicator updates and user feedback
    - _Requirements: 3.5, 6.2, 6.4_

- [ ] 11. Create comprehensive test suite
  - [ ] 11.1 Write unit tests for all service classes
    - Create test suites for TokenService, SessionService, UIService, and SyncService
    - Mock all external dependencies using Jest mocking capabilities
    - Test error conditions and edge cases for each service
    - Achieve high code coverage for core business logic
    - _Requirements: 4.3, 6.4_

  - [ ] 11.2 Write integration tests for storage and sync workflows
    - Create integration tests for LocalStorageAdapter and SupabaseStorageAdapter
    - Test complete sync workflow from local to remote storage
    - Test offline/online scenarios and conflict resolution
    - Test extension initialization and service integration
    - _Requirements: 4.3, 3.6, 6.4_

- [ ] 12. Performance optimization and final integration
  - [ ] 12.1 Optimize DOM observation and token counting performance
    - Implement efficient DOM querying with result caching
    - Add debouncing for frequent token count updates
    - Optimize memory usage and prevent memory leaks in observers
    - Measure and minimize extension impact on ChatGPT performance
    - Write performance tests to validate optimization improvements
    - _Requirements: 5.3, 5.4_

  - [ ] 12.2 Final integration and backward compatibility testing
    - Ensure all existing functionality works with new modular architecture
    - Test migration of existing user data to new system
    - Verify extension works across different ChatGPT interface versions
    - Test complete user workflows from installation to daily usage
    - Create end-to-end tests covering all major user scenarios
    - _Requirements: 1.2, 1.3, 2.1, 2.3_
