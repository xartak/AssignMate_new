"""Admin registrations for accounts app."""

from django import forms
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import ReadOnlyPasswordHashField

from accounts.models import User, ParentStudent


class AdminUserCreationForm(forms.ModelForm):
    """Форма создания пользователя в админ-панели."""

    password1 = forms.CharField(label="Пароль", widget=forms.PasswordInput)
    password2 = forms.CharField(label="Подтверждение пароля", widget=forms.PasswordInput)

    class Meta:
        model = User
        fields = ("email", "first_name", "last_name", "role")

    def clean(self):
        cleaned_data = super().clean()
        password1 = cleaned_data.get("password1")
        password2 = cleaned_data.get("password2")
        if password1 and password2 and password1 != password2:
            raise forms.ValidationError("Пароли не совпадают.")
        return cleaned_data

    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data["password1"])
        if commit:
            user.save()
        return user


class AdminUserChangeForm(forms.ModelForm):
    """Форма редактирования пользователя в админ-панели."""

    password = ReadOnlyPasswordHashField(label="Пароль")

    class Meta:
        model = User
        fields = (
            "email",
            "password",
            "first_name",
            "last_name",
            "patronymic",
            "age",
            "avatar",
            "bio",
            "contact_method",
            "role",
            "is_active",
            "is_staff",
            "is_superuser",
            "groups",
            "user_permissions",
        )


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Админка пользователей."""

    form = AdminUserChangeForm
    add_form = AdminUserCreationForm
    model = User

    list_display = ("email", "first_name", "last_name", "role", "is_staff", "is_active")
    list_filter = ("role", "is_staff", "is_active", "is_superuser")
    search_fields = ("email", "first_name", "last_name", "patronymic")
    ordering = ("email",)
    readonly_fields = ("last_login", "created_at", "updated_at")

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        (
            "Личные данные",
            {
                "fields": (
                    "first_name",
                    "last_name",
                    "patronymic",
                    "age",
                    "avatar",
                    "bio",
                    "contact_method",
                )
            },
        ),
        (
            "Права",
            {
                "fields": (
                    "role",
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Даты", {"fields": ("last_login", "created_at", "updated_at")}),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "first_name",
                    "last_name",
                    "role",
                    "password1",
                    "password2",
                    "is_active",
                    "is_staff",
                    "is_superuser",
                ),
            },
        ),
    )


@admin.register(ParentStudent)
class ParentStudentAdmin(admin.ModelAdmin):
    list_display = ("parent", "student", "created_at")
    search_fields = ("parent__email", "student__email")
    list_filter = ("created_at",)
