"""
Custom exceptions for Clarity SDK
"""


class ClaritySDKError(Exception):
    """Base exception for all Clarity SDK errors"""
    pass


class AgentError(ClaritySDKError):
    """Raised when agent operations fail"""
    pass


class WorkflowError(ClaritySDKError):
    """Raised when workflow operations fail"""
    pass


class TriggerError(ClaritySDKError):
    """Raised when trigger operations fail"""
    pass


class ValidationError(ClaritySDKError):
    """Raised when validation fails"""
    pass


class ExecutionError(ClaritySDKError):
    """Raised when execution fails"""
    pass


class IntegrationError(ClaritySDKError):
    """Raised when integration operations fail"""
    pass


class ConfigurationError(ClaritySDKError):
    """Raised when configuration is invalid"""
    pass
