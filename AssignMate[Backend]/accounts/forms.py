from django import forms
from django.contrib.auth import get_user_model

User = get_user_model()


class UserRegistrationForm(forms.ModelForm):
    """Форма регистрации пользователя.

    Attributes:
        password1: Поле ввода пароля.
        password2: Поле подтверждения пароля.
    """
    password1 = forms.CharField(
        label="Password",
        widget=forms.PasswordInput,
    )
    password2 = forms.CharField(
        label="Confirm password",
        widget=forms.PasswordInput,
    )

    class Meta:
        """Метаданные формы регистрации.

        Attributes:
            model: Модель пользователя.
            fields: Набор полей формы.
        """
        model = User
        fields = (
            "email",
            "first_name",
            "last_name",
            "role",
        )

    def clean(self):
        """Проверяет совпадение паролей.

        Returns:
            dict: Очищенные данные формы.

        Raises:
            forms.ValidationError: Если пароли не совпадают.
        """
        cleaned_data = super().clean()
        if cleaned_data["password1"] != cleaned_data["password2"]:
            raise forms.ValidationError("Passwords do not match")
        return cleaned_data

    def save(self, commit=True):
        """Создает пользователя и сохраняет пароль в виде хэша.

        Args:
            commit: Сохранять ли пользователя в БД.

        Returns:
            User: Созданный пользователь.
        """
        user = super().save(commit=False)
        user.set_password(self.cleaned_data["password1"])
        if commit:
            user.save()
        return user


class LoginForm(forms.Form):
    """Форма входа пользователя.

    Attributes:
        email: Поле email.
        password: Поле пароля.
    """
    email = forms.EmailField()
    password = forms.CharField(widget=forms.PasswordInput)
