class ActionSerializerMixin:
    """
    Миксин выбора сериализатора по action.

    Attributes:
        serializer_action_classes: Сопоставление action -> класс сериализатора.
    """
    serializer_action_classes = {}

    def get_serializer_class(self):
        """Возвращает сериализатор, соответствующий текущему action.

        Returns:
            type: Класс сериализатора.
        """
        serializer = self.serializer_action_classes.get(self.action)
        if serializer is not None:
            return serializer
        return super().get_serializer_class()


class ActionPermissionsMixin:
    """
    Миксин выбора permissions по action.

    Attributes:
        permission_classes_by_action: Сопоставление action -> список permissions.
    """
    permission_classes_by_action = {}

    def get_permissions(self):
        """Возвращает список permission-инстансов для текущего action.

        Returns:
            list: Список объектов permissions.
        """
        permissions = self.permission_classes_by_action.get(self.action, None)
        if permissions is None:
            permissions = getattr(self, "permission_classes", [])
        return [
            permission() if isinstance(permission, type) else permission
            for permission in permissions
        ]
