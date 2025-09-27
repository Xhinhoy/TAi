import { registerSchema, loginSchema } from '../../src/frontend/src/schemas/auth';
import { calculatePasswordStrength } from '../../src/frontend/src/components/ui/PasswordStrengthBar';

describe('Esquemas de validación de autenticación', () => {
  describe('registerSchema', () => {
    const validData = {
      displayName: 'Juan Pérez',
      email: 'juan@ejemplo.com',
      password: 'MiPassword123!',
      confirmPassword: 'MiPassword123!',
      acceptTerms: true,
    };

    it('debería validar datos correctos de registro', () => {
      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('debería fallar con email inválido', () => {
      const result = registerSchema.safeParse({
        ...validData,
        email: 'email-invalido',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('El correo electrónico no es válido');
      }
    });

    it('debería fallar con contraseña débil', () => {
      const result = registerSchema.safeParse({
        ...validData,
        password: '123',
        confirmPassword: '123',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('La contraseña debe tener al menos 8 caracteres');
      }
    });

    it('debería fallar si las contraseñas no coinciden', () => {
      const result = registerSchema.safeParse({
        ...validData,
        confirmPassword: 'ContraseñaDiferente123!',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Las contraseñas no coinciden');
      }
    });

    it('debería fallar si no acepta términos', () => {
      const result = registerSchema.safeParse({
        ...validData,
        acceptTerms: false,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Debes aceptar los términos y condiciones');
      }
    });

    it('debería permitir displayName vacío', () => {
      const result = registerSchema.safeParse({
        ...validData,
        displayName: '',
      });
      expect(result.success).toBe(true);
    });

    it('debería fallar con displayName con caracteres inválidos', () => {
      const result = registerSchema.safeParse({
        ...validData,
        displayName: 'Juan123',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('El nombre solo puede contener letras y espacios');
      }
    });
  });

  describe('loginSchema', () => {
    it('debería validar datos correctos de login', () => {
      const result = loginSchema.safeParse({
        email: 'juan@ejemplo.com',
        password: 'MiPassword123!',
      });
      expect(result.success).toBe(true);
    });

    it('debería fallar con email vacío', () => {
      const result = loginSchema.safeParse({
        email: '',
        password: 'MiPassword123!',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('El correo electrónico es requerido');
      }
    });

    it('debería fallar con contraseña vacía', () => {
      const result = loginSchema.safeParse({
        email: 'juan@ejemplo.com',
        password: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('La contraseña es requerida');
      }
    });
  });
});

describe('Medidor de fuerza de contraseña', () => {
  it('debería calcular contraseña muy débil', () => {
    const strength = calculatePasswordStrength('123');
    expect(strength.score).toBe(1);
    expect(strength.label).toBe('Muy débil');
    expect(strength.checks.length).toBe(false);
    expect(strength.checks.number).toBe(true);
  });

  it('debería calcular contraseña débil', () => {
    const strength = calculatePasswordStrength('password');
    expect(strength.score).toBe(2);
    expect(strength.label).toBe('Débil');
    expect(strength.checks.length).toBe(true);
    expect(strength.checks.lowercase).toBe(true);
  });

  it('debería calcular contraseña regular', () => {
    const strength = calculatePasswordStrength('Password');
    expect(strength.score).toBe(3);
    expect(strength.label).toBe('Regular');
    expect(strength.checks.length).toBe(true);
    expect(strength.checks.lowercase).toBe(true);
    expect(strength.checks.uppercase).toBe(true);
  });

  it('debería calcular contraseña fuerte', () => {
    const strength = calculatePasswordStrength('Password123');
    expect(strength.score).toBe(4);
    expect(strength.label).toBe('Fuerte');
    expect(strength.checks.length).toBe(true);
    expect(strength.checks.lowercase).toBe(true);
    expect(strength.checks.uppercase).toBe(true);
    expect(strength.checks.number).toBe(true);
  });

  it('debería calcular contraseña muy fuerte', () => {
    const strength = calculatePasswordStrength('Password123!');
    expect(strength.score).toBe(5);
    expect(strength.label).toBe('Muy fuerte');
    expect(strength.checks.length).toBe(true);
    expect(strength.checks.lowercase).toBe(true);
    expect(strength.checks.uppercase).toBe(true);
    expect(strength.checks.number).toBe(true);
    expect(strength.checks.special).toBe(true);
  });

  it('debería manejar contraseña vacía', () => {
    const strength = calculatePasswordStrength('');
    expect(strength.score).toBe(0);
    expect(strength.label).toBe('Muy débil');
    expect(Object.values(strength.checks).every(check => !check)).toBe(true);
  });
});